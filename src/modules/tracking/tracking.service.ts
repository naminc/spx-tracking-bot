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

export type AddTrackingResult = {
  order: TrackingOrderEntity;
  latestRecord: NormalizedSpxRecord;
  alreadyExists: boolean;
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

  listOrders(telegramChatId?: string, includeCompleted = false): Promise<TrackingOrderEntity[]> {
    return this.repository.findOrders(telegramChatId, includeCompleted);
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

  async addOrder(trackingNumber: string, telegramChatId = 'api'): Promise<AddTrackingResult> {
    const existingOrder = await this.repository.findByTrackingNumberAndChat(
      trackingNumber,
      telegramChatId,
    );

    if (existingOrder) {
      return {
        order: existingOrder,
        latestRecord: this.orderToRecord(existingOrder),
        alreadyExists: true,
      };
    }

    const latestRecord = await this.spx.getLatestTrackingRecord(trackingNumber);
    const finalStatus = this.detectFinalStatus(latestRecord.status);
    const order = await this.repository.createOrder({
      trackingNumber,
      telegramChatId,
      latestRecord,
      finalStatus,
      isCompleted: finalStatus !== FinalStatus.PENDING,
    });

    return { order, latestRecord, alreadyExists: false };
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
}

export const trackingService = new TrackingService();
