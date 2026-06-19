import type { Prisma } from '@prisma/client';
import type { InputJsonObject, InputJsonValue } from '@prisma/client/runtime/library';
import { prisma } from '../../shared/prisma/client';
import type { NormalizedSpxRecord } from '../spx/spx.service';
import type { FinalStatus } from './final-status';

const userSelect = {
  id: true,
  telegramUserId: true,
  username: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const trackingOrderInclude = {
  user: { select: userSelect },
} satisfies Prisma.TrackingOrderInclude;

const trackingHistoryOrderSelect = {
  trackingNumber: true,
  telegramChatId: true,
  userId: true,
  note: true,
  user: { select: userSelect },
} satisfies Prisma.TrackingOrderSelect;

export type TrackingUserEntity = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;
export type TrackingOrderEntity = Prisma.TrackingOrderGetPayload<{
  include: typeof trackingOrderInclude;
}>;
export type TrackingHistoryEntity = Awaited<
  ReturnType<typeof prisma.trackingHistory.findMany>
>[number];
export type TrackingHistoryWithOrderEntity = Prisma.TrackingHistoryGetPayload<{
  include: { order: { select: typeof trackingHistoryOrderSelect } };
}>;

type FindOrdersFilters = {
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: number;
  telegramUserId?: string;
  finalStatus?: FinalStatus;
  includeCompleted?: boolean;
};

type CreateOrderInput = {
  trackingNumber: string;
  telegramChatId: string;
  note?: string | null;
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
  findOrders(filters: FindOrdersFilters = {}): Promise<TrackingOrderEntity[]> {
    const where: Prisma.TrackingOrderWhereInput = {
      trackingNumber: filters.trackingNumber
        ? { contains: filters.trackingNumber }
        : undefined,
      telegramChatId: filters.telegramChatId
        ? { contains: filters.telegramChatId }
        : undefined,
      finalStatus: filters.finalStatus,
      ...(filters.finalStatus || filters.includeCompleted ? {} : { isCompleted: false }),
    };

    if (filters.userId) {
      where.userId = filters.userId;
    } else if (filters.telegramUserId) {
      where.user = { telegramUserId: filters.telegramUserId };
    }

    return prisma.trackingOrder.findMany({
      where,
      include: trackingOrderInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findActiveOrders(): Promise<TrackingOrderEntity[]> {
    return prisma.trackingOrder.findMany({
      where: { isCompleted: false },
      include: trackingOrderInclude,
      orderBy: { updatedAt: 'asc' },
    });
  }

  findByTrackingNumber(trackingNumber: string): Promise<TrackingOrderEntity | null> {
    return prisma.trackingOrder.findFirst({
      where: { trackingNumber },
      include: trackingOrderInclude,
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
      include: trackingOrderInclude,
    });
  }

  async createOrder(input: CreateOrderInput): Promise<TrackingOrderEntity> {
    return prisma.$transaction(async (transaction) => {
      const telegramUserId = input.telegramChatId === 'api' ? undefined : input.telegramChatId;
      let userId: number | null = null;

      if (telegramUserId) {
        const existingUser = await transaction.user.findUnique({
          where: { telegramUserId },
          select: { id: true },
        });

        const user =
          existingUser ??
          (await transaction.user.create({
            data: { telegramUserId },
            select: { id: true },
          }));

        userId = user.id;
      }

      const order = await transaction.trackingOrder.create({
        data: {
          trackingNumber: input.trackingNumber,
          telegramChatId: input.telegramChatId,
          userId,
          note: input.note ?? null,
          currentStatus: input.latestRecord.status,
          currentStatusCode: input.latestRecord.trackingCode,
          currentLocation: input.latestRecord.location,
          nextLocation: input.latestRecord.nextLocation,
          milestoneCode: input.latestRecord.milestoneCode,
          milestoneName: input.latestRecord.milestoneName,
          lastEventTime: input.latestRecord.eventTime,
          isCompleted: input.isCompleted,
          finalStatus: input.finalStatus,
        },
        include: trackingOrderInclude,
      });

      await transaction.trackingHistory.create({
        data: this.toHistoryCreateInput(order.id, input.latestRecord),
      });

      return order;
    });
  }

  updateOrderNote(orderId: number, note: string | null): Promise<TrackingOrderEntity> {
    return prisma.trackingOrder.update({
      where: { id: orderId },
      data: { note },
      include: trackingOrderInclude,
    });
  }

  async updateOrderWithHistory(input: UpdateOrderInput): Promise<TrackingOrderEntity> {
    return prisma.$transaction(async (transaction) => {
      const order = await transaction.trackingOrder.update({
        where: { id: input.orderId },
        data: {
          currentStatus: input.latestRecord.status,
          currentStatusCode: input.latestRecord.trackingCode,
          currentLocation: input.latestRecord.location,
          nextLocation: input.latestRecord.nextLocation,
          milestoneCode: input.latestRecord.milestoneCode,
          milestoneName: input.latestRecord.milestoneName,
          lastEventTime: input.latestRecord.eventTime,
          isCompleted: input.isCompleted,
          finalStatus: input.finalStatus,
        },
        include: trackingOrderInclude,
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

    return prisma.trackingOrder.delete({ where: { id: order.id }, include: trackingOrderInclude });
  }

  findHistoriesByTrackingNumber(trackingNumber: string): Promise<TrackingHistoryEntity[]> {
    return prisma.trackingHistory.findMany({
      where: {
        order: { trackingNumber },
      },
      orderBy: { eventTime: 'desc' },
    });
  }

  listHistories(filters: {
    trackingNumber?: string;
    telegramChatId?: string;
    userId?: number;
    telegramUserId?: string;
    limit?: number;
  }): Promise<TrackingHistoryWithOrderEntity[]> {
    return prisma.trackingHistory.findMany({
      where:
        filters.trackingNumber || filters.telegramChatId || filters.userId || filters.telegramUserId
          ? {
              order: {
                trackingNumber: filters.trackingNumber
                  ? { contains: filters.trackingNumber }
                  : undefined,
                telegramChatId: filters.telegramChatId
                  ? { contains: filters.telegramChatId }
                  : undefined,
                userId: filters.userId,
                user: !filters.userId && filters.telegramUserId
                  ? { telegramUserId: filters.telegramUserId }
                  : undefined,
              },
            }
          : undefined,
      include: {
        order: {
          select: trackingHistoryOrderSelect,
        },
      },
      orderBy: { eventTime: 'desc' },
      take: filters.limit,
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
      location: latestRecord.location,
      nextLocation: latestRecord.nextLocation,
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
