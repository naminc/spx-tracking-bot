import type { InputJsonObject, InputJsonValue } from '@prisma/client/runtime/library';
import { prisma } from '../../shared/prisma/client';
import type { NormalizedSpxRecord } from '../spx/spx.service';
import type { FinalStatus } from './final-status';

export type TrackingOrderEntity = NonNullable<
  Awaited<ReturnType<typeof prisma.trackingOrder.findFirst>>
>;
export type TrackingHistoryEntity = Awaited<
  ReturnType<typeof prisma.trackingHistory.findMany>
>[number];

type CreateOrderInput = {
  trackingNumber: string;
  telegramChatId: string;
  latestRecord: NormalizedSpxRecord;
  isCompleted: boolean;
  finalStatus: FinalStatus;
};

type UpdateOrderInput = {
  orderId: number;
  latestRecord: NormalizedSpxRecord;
  isCompleted: boolean;
  finalStatus: FinalStatus;
};

type JsonNestedValue = InputJsonValue | null;

const toJsonNestedValue = (value: unknown): JsonNestedValue => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonNestedValue(item));
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, JsonNestedValue>>((result, [key, item]) => {
      if (item !== undefined) {
        result[key] = toJsonNestedValue(item);
      }

      return result;
    }, {});
  }

  return String(value);
};

const toJsonObject = (value: Record<string, unknown>): InputJsonObject =>
  Object.entries(value).reduce<InputJsonObject>((result, [key, item]) => {
    if (item !== undefined) {
      return {
        ...result,
        [key]: toJsonNestedValue(item),
      };
    }

    return result;
  }, {});

export class TrackingRepository {
  findOrders(telegramChatId?: string, includeCompleted = false): Promise<TrackingOrderEntity[]> {
    return prisma.trackingOrder.findMany({
      where: {
        telegramChatId,
        ...(includeCompleted ? {} : { isCompleted: false }),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findActiveOrders(): Promise<TrackingOrderEntity[]> {
    return prisma.trackingOrder.findMany({
      where: { isCompleted: false },
      orderBy: { updatedAt: 'asc' },
    });
  }

  findByTrackingNumber(trackingNumber: string): Promise<TrackingOrderEntity | null> {
    return prisma.trackingOrder.findFirst({
      where: { trackingNumber },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findByTrackingNumberAndChat(
    trackingNumber: string,
    telegramChatId: string,
  ): Promise<TrackingOrderEntity | null> {
    return prisma.trackingOrder.findUnique({
      where: {
        trackingNumber_telegramChatId: {
          trackingNumber,
          telegramChatId,
        },
      },
    });
  }

  async createOrder(input: CreateOrderInput): Promise<TrackingOrderEntity> {
    return prisma.$transaction(async (transaction) => {
      const order = await transaction.trackingOrder.create({
        data: {
          trackingNumber: input.trackingNumber,
          telegramChatId: input.telegramChatId,
          currentStatus: input.latestRecord.status,
          currentStatusCode: input.latestRecord.trackingCode,
          milestoneCode: input.latestRecord.milestoneCode,
          milestoneName: input.latestRecord.milestoneName,
          lastEventTime: input.latestRecord.eventTime,
          isCompleted: input.isCompleted,
          finalStatus: input.finalStatus,
        },
      });

      await transaction.trackingHistory.create({
        data: this.toHistoryCreateInput(order.id, input.latestRecord),
      });

      return order;
    });
  }

  async updateOrderWithHistory(input: UpdateOrderInput): Promise<TrackingOrderEntity> {
    return prisma.$transaction(async (transaction) => {
      const order = await transaction.trackingOrder.update({
        where: { id: input.orderId },
        data: {
          currentStatus: input.latestRecord.status,
          currentStatusCode: input.latestRecord.trackingCode,
          milestoneCode: input.latestRecord.milestoneCode,
          milestoneName: input.latestRecord.milestoneName,
          lastEventTime: input.latestRecord.eventTime,
          isCompleted: input.isCompleted,
          finalStatus: input.finalStatus,
        },
      });

      await transaction.trackingHistory.create({
        data: this.toHistoryCreateInput(order.id, input.latestRecord),
      });

      return order;
    });
  }

  async deleteByTrackingNumberAndChat(
    trackingNumber: string,
    telegramChatId: string,
  ): Promise<TrackingOrderEntity | null> {
    const order = await this.findByTrackingNumberAndChat(trackingNumber, telegramChatId);

    if (!order) {
      return null;
    }

    return prisma.trackingOrder.delete({ where: { id: order.id } });
  }

  findHistoriesByTrackingNumber(trackingNumber: string): Promise<TrackingHistoryEntity[]> {
    return prisma.trackingHistory.findMany({
      where: {
        order: { trackingNumber },
      },
      orderBy: { eventTime: 'desc' },
    });
  }

  private toHistoryCreateInput(
    orderId: number,
    latestRecord: NormalizedSpxRecord,
  ) {
    return {
      orderId,
      trackingCode: latestRecord.trackingCode,
      trackingName: latestRecord.trackingName,
      status: latestRecord.status,
      description: latestRecord.description,
      buyerDescription: latestRecord.buyerDescription,
      sellerDescription: latestRecord.sellerDescription,
      milestoneCode: latestRecord.milestoneCode,
      milestoneName: latestRecord.milestoneName,
      eventTime: latestRecord.eventTime,
      rawData: toJsonObject(latestRecord.rawData),
    };
  }
}

export const trackingRepository = new TrackingRepository();
