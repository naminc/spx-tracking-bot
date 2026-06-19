import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { logger } from '../../shared/logger/logger';
import { NormalizedSpxRecord, spxService, SpxService } from '../spx/spx.service';
import { FinalStatus } from './final-status';
import {
  TrackingHistoryEntity,
  TrackingOrderEntity,
  TrackingRepository,
  trackingRepository,
} from './tracking.repository';
import { MAX_ORDER_NOTE_LENGTH } from './tracking.schema';

export type AddTrackingResult = {
  order: TrackingOrderEntity;
  latestRecord: NormalizedSpxRecord;
  alreadyExists: boolean;
  noteUpdated: boolean;
};

export type TrackingNotification = {
  chatId: string;
  trackingNumber: string;
  status: string;
  trackingCode: string;
  location?: string;
  nextLocation?: string;
  milestoneName?: string;
  eventTime: Date;
  finalStatus: FinalStatus;
  note?: string;
};

type ListOrdersFilters = {
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: number;
  telegramUserId?: string;
  finalStatus?: FinalStatus;
  includeCompleted?: boolean;
};

type ListHistoriesFilters = {
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: number;
  telegramUserId?: string;
  limit?: number;
};

const normalize = (value: string): string => value.trim().toLowerCase();

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export class TrackingService {
  constructor(
    private readonly repository: TrackingRepository = trackingRepository,
    private readonly spx: SpxService = spxService,
  ) {}

  listOrders(filters: ListOrdersFilters = {}): Promise<TrackingOrderEntity[]> {
    return this.repository.findOrders(filters);
  }

  async getOrder(trackingNumber: string): Promise<TrackingOrderEntity> {
    const order = await this.repository.findByTrackingNumber(trackingNumber);

    if (!order) {
      throw new AppError('Tracking order not found', 404);
    }

    return order;
  }

  async hasOrder(trackingNumber: string, telegramChatId: string): Promise<boolean> {
    const order = await this.repository.findByTrackingNumberAndChat(trackingNumber, telegramChatId);
    return Boolean(order);
  }

  getHistories(trackingNumber: string): Promise<TrackingHistoryEntity[]> {
    return this.repository.findHistoriesByTrackingNumber(trackingNumber);
  }

  listHistories(filters: ListHistoriesFilters) {
    return this.repository.listHistories(filters);
  }

  async addOrder(
    trackingNumber: string,
    telegramChatId = 'api',
    note?: string | null,
  ): Promise<AddTrackingResult> {
    const normalizedNote = this.normalizeNote(note);
    const existingOrder = await this.repository.findByTrackingNumberAndChat(
      trackingNumber,
      telegramChatId,
    );

    if (existingOrder) {
      const shouldUpdateNote = normalizedNote !== undefined && existingOrder.note !== normalizedNote;
      const order = shouldUpdateNote
        ? await this.repository.updateOrderNote(existingOrder.id, normalizedNote)
        : existingOrder;

      return {
        order,
        latestRecord: this.orderToRecord(order),
        alreadyExists: true,
        noteUpdated: shouldUpdateNote,
      };
    }

    const latestRecord = await this.spx.getLatestTrackingRecord(trackingNumber);
    const finalStatus = this.detectFinalStatus(latestRecord.status);
    const order = await this.repository.createOrder({
      trackingNumber,
      telegramChatId,
      note: normalizedNote ?? null,
      latestRecord,
      finalStatus,
      isCompleted: finalStatus !== FinalStatus.PENDING,
    });

    return { order, latestRecord, alreadyExists: false, noteUpdated: false };
  }

  async removeOrder(trackingNumber: string, telegramChatId = 'api'): Promise<TrackingOrderEntity> {
    const deletedOrder = await this.repository.deleteByTrackingNumberAndChat(
      trackingNumber,
      telegramChatId,
    );

    if (!deletedOrder) {
      throw new AppError('Tracking order not found', 404);
    }

    return deletedOrder;
  }

  async checkActiveOrders(): Promise<TrackingNotification[]> {
    const activeOrders = await this.repository.findActiveOrders();
    const notifications: TrackingNotification[] = [];

    for (const order of activeOrders) {
      try {
        const latestRecord = await this.spx.getLatestTrackingRecord(order.trackingNumber);
        const hasChanged =
          order.currentStatusCode !== latestRecord.trackingCode ||
          order.lastEventTime.getTime() !== latestRecord.eventTime.getTime();

        const finalStatus = this.detectFinalStatus(latestRecord.status);
        const isCompleted = finalStatus !== FinalStatus.PENDING;

        if (hasChanged || isCompleted !== order.isCompleted) {
          await this.repository.updateOrderWithHistory({
            orderId: order.id,
            latestRecord,
            finalStatus,
            isCompleted,
          });

          notifications.push({
            chatId: order.telegramChatId,
            trackingNumber: order.trackingNumber,
            status: latestRecord.status,
            trackingCode: latestRecord.trackingCode,
            location: latestRecord.location,
            nextLocation: latestRecord.nextLocation,
            milestoneName: latestRecord.milestoneName,
            eventTime: latestRecord.eventTime,
            finalStatus,
            note: order.note ?? undefined,
          });
        }
      } catch (error) {
        logger.error({ err: error, orderId: order.id }, 'Failed to refresh SPX tracking order');
      }

      await delay(500);
    }

    return notifications;
  }

  detectFinalStatus(status: string): FinalStatus {
    const normalizedStatus = normalize(status);

    if (env.DELIVERED_KEYWORDS.some((keyword) => normalizedStatus.includes(normalize(keyword)))) {
      return FinalStatus.DELIVERED;
    }

    if (env.FAILED_KEYWORDS.some((keyword) => normalizedStatus.includes(normalize(keyword)))) {
      return FinalStatus.FAILED;
    }

    if (env.CANCELLED_KEYWORDS.some((keyword) => normalizedStatus.includes(normalize(keyword)))) {
      return FinalStatus.CANCELLED;
    }

    return FinalStatus.PENDING;
  }

  private orderToRecord(order: TrackingOrderEntity): NormalizedSpxRecord {
    return {
      trackingCode: order.currentStatusCode,
      trackingName: undefined,
      status: order.currentStatus,
      location: order.currentLocation ?? undefined,
      nextLocation: order.nextLocation ?? undefined,
      milestoneCode: order.milestoneCode ?? undefined,
      milestoneName: order.milestoneName ?? undefined,
      eventTime: order.lastEventTime,
      rawData: {
        tracking_code: order.currentStatusCode,
        location: order.currentLocation ?? undefined,
        next_location: order.nextLocation ?? undefined,
        milestone_code: order.milestoneCode ?? undefined,
        milestone_name: order.milestoneName ?? undefined,
        buyer_description: order.currentStatus,
        actual_time: Math.floor(order.lastEventTime.getTime() / 1000),
      },
    };
  }

  private normalizeNote(note: string | null | undefined): string | null | undefined {
    if (note === undefined) {
      return undefined;
    }

    if (note === null) {
      return null;
    }

    const trimmedNote = note.trim();

    if (!trimmedNote) {
      return null;
    }

    if (trimmedNote.length > MAX_ORDER_NOTE_LENGTH) {
      throw new AppError(`Note must be at most ${MAX_ORDER_NOTE_LENGTH} characters`, 400);
    }

    return trimmedNote;
  }
}

export const trackingService = new TrackingService();
