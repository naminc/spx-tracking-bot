import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { logger } from '../../shared/logger/logger';
import type { PaginatedRepositoryResult, PaginationInput } from '../../shared/pagination/pagination';
import { GhnService, ghnService } from '../ghn/ghn.service';
import { JntService, jntService } from '../jnt/jnt.service';
import { spxService, SpxService } from '../spx/spx.service';
import { FinalStatus } from './final-status';
import {
  TrackingHistoryEntity,
  TrackingOrderEntity,
  TrackingRepository,
  trackingRepository,
} from './tracking.repository';
import { MAX_ORDER_NOTE_LENGTH } from './tracking.schema';
import {
  TrackingCarrier,
  detectTrackingCarrier,
  isValidTrackingNumberForCarrier,
  normalizeTrackingNumber,
} from './tracking-carrier';
import {
  jntPhoneLast4Pattern,
  normalizeGhnTrackingCredential,
} from './tracking-credential';
import type { NormalizedTrackingRecord } from './tracking-record';

export type AddTrackingResult = {
  order: TrackingOrderEntity;
  latestRecord: NormalizedTrackingRecord;
  alreadyExists: boolean;
  noteUpdated: boolean;
};

export type TrackingNotification = {
  carrier: TrackingCarrier;
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
  carrier?: TrackingCarrier;
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: number;
  telegramUserId?: string;
  finalStatus?: FinalStatus;
  includeCompleted?: boolean;
  sort?: 'UPDATED_DESC' | 'CREATED_DESC' | 'LAST_EVENT_DESC' | 'STATUS';
} & Partial<PaginationInput>;

type ListHistoriesFilters = {
  carrier?: TrackingCarrier;
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: number;
  telegramUserId?: string;
  sort?: 'EVENT_DESC' | 'EVENT_ASC' | 'CREATED_DESC';
} & Partial<PaginationInput>;

const normalize = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const includesPhrase = (value: string, phrase: string): boolean => {
  const normalizedValue = normalize(value);
  const normalizedPhrase = normalize(phrase);
  const phrasePattern = escapeRegExp(normalizedPhrase).replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${phrasePattern}([^a-z0-9]|$)`).test(normalizedValue);
};

const includesAnyPhrase = (value: string, phrases: string[]): boolean =>
  phrases.some((phrase) => includesPhrase(value, phrase));

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export class TrackingService {
  constructor(
    private readonly repository: TrackingRepository = trackingRepository,
    private readonly spx: SpxService = spxService,
    private readonly ghn: GhnService = ghnService,
    private readonly jnt: JntService = jntService,
  ) {}

  listOrders(
    filters: ListOrdersFilters = {},
  ): Promise<PaginatedRepositoryResult<TrackingOrderEntity>> {
    return this.repository.findOrders(filters);
  }

  listAllOrders(filters: ListOrdersFilters = {}): Promise<TrackingOrderEntity[]> {
    return this.repository.findAllOrders(filters);
  }

  async getOrder(trackingNumber: string, carrierHint: TrackingCarrier | 'AUTO' = 'AUTO'): Promise<TrackingOrderEntity> {
    const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
    const carrier = this.resolveCarrier(normalizedTrackingNumber, carrierHint);
    const order = await this.repository.findByTrackingNumber(normalizedTrackingNumber, carrier);

    if (!order) {
      throw new AppError('Tracking order not found', 404);
    }

    return order;
  }

  async hasOrder(
    trackingNumber: string,
    telegramChatId: string,
    carrierHint: TrackingCarrier | 'AUTO' = 'AUTO',
  ): Promise<boolean> {
    const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
    const carrier = this.resolveCarrier(normalizedTrackingNumber, carrierHint);
    const order = await this.repository.findByTrackingNumberAndChat(
      carrier,
      normalizedTrackingNumber,
      telegramChatId,
    );
    return Boolean(order);
  }

  getHistories(
    trackingNumber: string,
    carrierHint: TrackingCarrier | 'AUTO' = 'AUTO',
  ): Promise<TrackingHistoryEntity[]> {
    const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
    const carrier = this.resolveCarrier(normalizedTrackingNumber, carrierHint);
    return this.repository.findHistoriesByTrackingNumber(normalizedTrackingNumber, carrier);
  }

  listHistories(filters: ListHistoriesFilters) {
    return this.repository.listHistories(filters);
  }

  async addOrder(
    trackingNumber: string,
    telegramChatId = 'api',
    note?: string | null,
    carrierHint: TrackingCarrier | 'AUTO' = 'AUTO',
    trackingCredential?: string | null,
    userId?: number,
  ): Promise<AddTrackingResult> {
    const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
    const carrier = this.resolveCarrier(normalizedTrackingNumber, carrierHint);
    const owner = await this.resolveOrderOwner(userId, telegramChatId);
    const normalizedNote = this.normalizeNote(note);
    const normalizedTrackingCredential = this.normalizeTrackingCredential(
      carrier,
      normalizedTrackingNumber,
      trackingCredential,
    );
    const existingOrder = await this.repository.findByTrackingNumberAndChat(
      carrier,
      normalizedTrackingNumber,
      owner.telegramChatId,
    );

    if (existingOrder) {
      const shouldUpdateNote = normalizedNote !== undefined && existingOrder.note !== normalizedNote;
      const shouldUpdateCredential =
        normalizedTrackingCredential !== undefined &&
        existingOrder.trackingCredential !== normalizedTrackingCredential;
      const shouldUpdateUserId =
        owner.userId !== undefined && existingOrder.userId !== owner.userId;
      const order = shouldUpdateNote || shouldUpdateCredential || shouldUpdateUserId
        ? await this.repository.updateOrderDetails(existingOrder.id, {
            note: shouldUpdateNote ? normalizedNote : undefined,
            trackingCredential: shouldUpdateCredential
              ? normalizedTrackingCredential
              : undefined,
            userId: shouldUpdateUserId ? owner.userId : undefined,
          })
        : existingOrder;

      return {
        order,
        latestRecord: this.orderToRecord(order),
        alreadyExists: true,
        noteUpdated: shouldUpdateNote,
      };
    }

    const latestRecord = await this.getLatestTrackingRecord(
      carrier,
      normalizedTrackingNumber,
      normalizedTrackingCredential,
    );
    const finalStatus = this.detectFinalStatus(
      latestRecord.status,
      latestRecord.trackingCode,
      carrier,
    );
    const order = await this.repository.createOrder({
      carrier,
      trackingNumber: normalizedTrackingNumber,
      telegramChatId: owner.telegramChatId,
      userId: owner.userId,
      note: normalizedNote ?? null,
      trackingCredential: normalizedTrackingCredential ?? null,
      latestRecord,
      finalStatus,
      isCompleted: finalStatus !== FinalStatus.PENDING,
    });

    return { order, latestRecord, alreadyExists: false, noteUpdated: false };
  }

  async removeOrder(
    trackingNumber: string,
    telegramChatId = 'api',
    carrierHint: TrackingCarrier | 'AUTO' = 'AUTO',
  ): Promise<TrackingOrderEntity> {
    const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
    const carrier = this.resolveCarrier(normalizedTrackingNumber, carrierHint);
    const deletedOrder = await this.repository.deleteByTrackingNumberAndChat(
      carrier,
      normalizedTrackingNumber,
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
      if (order.carrier === TrackingCarrier.GHN && !order.trackingCredential) {
        logger.warn(
          { carrier: order.carrier, orderId: order.id, trackingNumber: order.trackingNumber },
          'Skipped GHN tracking order because phone_verify is missing',
        );
        await delay(500);
        continue;
      }

      try {
        const latestRecord = await this.getLatestTrackingRecord(
          order.carrier,
          order.trackingNumber,
          order.trackingCredential,
        );
        const hasChanged =
          order.currentStatusCode !== latestRecord.trackingCode ||
          order.lastEventTime.getTime() !== latestRecord.eventTime.getTime();

        const finalStatus = this.detectFinalStatus(
          latestRecord.status,
          latestRecord.trackingCode,
          order.carrier,
        );
        const isCompleted = finalStatus !== FinalStatus.PENDING;

        if (hasChanged || isCompleted !== order.isCompleted) {
          await this.repository.updateOrderWithHistory({
            orderId: order.id,
            latestRecord,
            finalStatus,
            isCompleted,
          });

          notifications.push({
            carrier: order.carrier,
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
        logger.error(
          { err: error, carrier: order.carrier, orderId: order.id },
          'Failed to refresh tracking order',
        );
      }

      await delay(500);
    }

    return notifications;
  }

  detectFinalStatus(
    status: string,
    trackingCode?: string,
    carrier: TrackingCarrier = TrackingCarrier.SPX,
  ): FinalStatus {
    if (carrier === TrackingCarrier.GHN) {
      return this.detectGhnFinalStatus(status, trackingCode);
    }

    if (carrier === TrackingCarrier.JNT) {
      return this.detectJntFinalStatus(status, trackingCode);
    }

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

  private getLatestTrackingRecord(
    carrier: TrackingCarrier,
    trackingNumber: string,
    trackingCredential?: string | null,
  ): Promise<NormalizedTrackingRecord> {
    if (carrier === TrackingCarrier.GHN) {
      return this.ghn.getLatestTrackingRecord(trackingNumber, trackingCredential);
    }

    if (carrier === TrackingCarrier.JNT) {
      return this.jnt.getLatestTrackingRecord(trackingNumber, trackingCredential);
    }

    return this.spx.getLatestTrackingRecord(trackingNumber);
  }

  private resolveCarrier(
    trackingNumber: string,
    carrierHint: TrackingCarrier | 'AUTO' = 'AUTO',
  ): TrackingCarrier {
    const carrier = detectTrackingCarrier(trackingNumber, carrierHint);

    if (!carrier || !isValidTrackingNumberForCarrier(trackingNumber, carrier)) {
      throw new AppError('Tracking number must be a valid SPX, GHN, or J&T code', 400);
    }

    return carrier;
  }

  private async resolveOrderOwner(
    userId: number | undefined,
    telegramChatId: string,
  ): Promise<{ telegramChatId: string; userId?: number }> {
    if (!userId) {
      return { telegramChatId };
    }

    const user = await this.repository.findUserByIdForOrder(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      telegramChatId: user.telegramUserId,
      userId: user.id,
    };
  }

  private detectGhnFinalStatus(status: string, trackingCode?: string): FinalStatus {
    const normalizedStatus = normalize(`${trackingCode ?? ''} ${status}`);

    if (includesAnyPhrase(normalizedStatus, ['delivered', 'delivery_success', 'da giao hang', 'giao hang thanh cong'])) {
      return FinalStatus.DELIVERED;
    }

    if (includesAnyPhrase(normalizedStatus, ['cancel', 'cancelled', 'canceled', 'da huy', 'huy'])) {
      return FinalStatus.CANCELLED;
    }

    const isPickupFailure =
      includesAnyPhrase(normalizedStatus, ['pick_fail', 'pick_failed', 'lay hang khong thanh cong']);

    if (
      !isPickupFailure &&
      includesAnyPhrase(normalizedStatus, [
        'delivery_fail',
        'delivery_failed',
        'fail',
        'failed',
        'khong thanh cong',
        'giao that bai',
      ])
    ) {
      return FinalStatus.FAILED;
    }

    return FinalStatus.PENDING;
  }

  private detectJntFinalStatus(status: string, trackingCode?: string): FinalStatus {
    const normalizedStatus = normalize(`${trackingCode ?? ''} ${status}`);

    if (includesAnyPhrase(normalizedStatus, ['delivered', 'da ky nhan', 'giao hang thanh cong'])) {
      return FinalStatus.DELIVERED;
    }

    if (includesAnyPhrase(normalizedStatus, ['cancel', 'cancelled', 'canceled', 'da huy'])) {
      return FinalStatus.CANCELLED;
    }

    if (includesAnyPhrase(normalizedStatus, ['khong thanh cong', 'that bai', 'failed'])) {
      return FinalStatus.FAILED;
    }

    return FinalStatus.PENDING;
  }

  private orderToRecord(order: TrackingOrderEntity): NormalizedTrackingRecord {
    return {
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
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

  private normalizeTrackingCredential(
    carrier: TrackingCarrier,
    trackingNumber: string,
    trackingCredential: string | null | undefined,
  ): string | null | undefined {
    if (trackingCredential === undefined) {
      if (carrier === TrackingCarrier.GHN) {
        throw new AppError('GHN requires recipient phone or phone_verify to track this order', 400);
      }

      if (carrier === TrackingCarrier.JNT) {
        throw new AppError('J&T tracking requires phone last 4 digits', 400);
      }

      return undefined;
    }

    if (carrier === TrackingCarrier.SPX) {
      return undefined;
    }

    const trimmedCredential = trackingCredential?.trim() ?? '';

    if (carrier === TrackingCarrier.GHN) {
      const phoneVerify = normalizeGhnTrackingCredential(trackingNumber, trimmedCredential);

      if (!phoneVerify) {
        throw new AppError('GHN requires a valid recipient phone or 64-character phone_verify', 400);
      }

      return phoneVerify;
    }

    if (!jntPhoneLast4Pattern.test(trimmedCredential)) {
      throw new AppError('J&T phone last 4 must contain exactly 4 digits', 400);
    }

    return trimmedCredential;
  }
}

export const trackingService = new TrackingService();
