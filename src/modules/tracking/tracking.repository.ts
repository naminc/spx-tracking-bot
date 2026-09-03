import type { Prisma } from '@prisma/client';
import type { InputJsonObject, InputJsonValue } from '@prisma/client/runtime/library';
import {
  getPaginationArgs,
  type PaginatedRepositoryResult,
  type PaginationInput,
} from '../../shared/pagination/pagination';
import { prisma } from '../../shared/prisma/client';
import type { FinalStatus } from './final-status';
import type { TrackingCarrier } from './tracking-carrier';
import type { NormalizedTrackingRecord } from './tracking-record';

const userSelect = {
  id: true,
  telegramUserId: true,
  username: true,
  firstName: true,
  lastName: true,
  isBlocked: true,
} satisfies Prisma.UserSelect;

const trackingOrderInclude = {
  user: { select: userSelect },
} satisfies Prisma.TrackingOrderInclude;

const trackingHistoryOrderSelect = {
  carrier: true,
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

const orderOrderByBySort: Record<
  NonNullable<FindOrdersFilters['sort']>,
  Prisma.TrackingOrderOrderByWithRelationInput[]
> = {
  UPDATED_DESC: [{ updatedAt: 'desc' }],
  CREATED_DESC: [{ createdAt: 'desc' }],
  LAST_EVENT_DESC: [{ lastEventTime: 'desc' }, { updatedAt: 'desc' }],
  STATUS: [{ finalStatus: 'asc' }, { updatedAt: 'desc' }],
};

const historyOrderByBySort: Record<
  NonNullable<ListHistoriesFilters['sort']>,
  Prisma.TrackingHistoryOrderByWithRelationInput[]
> = {
  EVENT_DESC: [{ eventTime: 'desc' }],
  EVENT_ASC: [{ eventTime: 'asc' }],
  CREATED_DESC: [{ createdAt: 'desc' }],
};

type CreateOrderInput = {
  carrier: TrackingCarrier;
  trackingNumber: string;
  telegramChatId: string;
  note?: string | null;
  trackingCredential?: string | null;
  latestRecord: NormalizedTrackingRecord;
  isCompleted: boolean;
  finalStatus: FinalStatus;
};

type UpdateOrderInput = {
  orderId: number;
  latestRecord: NormalizedTrackingRecord;
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
  async findOrders(
    filters: FindOrdersFilters = {},
  ): Promise<PaginatedRepositoryResult<TrackingOrderEntity>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const where = await this.buildOrderWhere(filters);
    const [data, total] = await prisma.$transaction([
      prisma.trackingOrder.findMany({
        where,
        include: trackingOrderInclude,
        orderBy: orderOrderByBySort[filters.sort ?? 'UPDATED_DESC'],
        ...getPaginationArgs({ page, limit }),
      }),
      prisma.trackingOrder.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findAllOrders(filters: FindOrdersFilters = {}): Promise<TrackingOrderEntity[]> {
    const where = await this.buildOrderWhere(filters);

    return prisma.trackingOrder.findMany({
      where,
      include: trackingOrderInclude,
      orderBy: orderOrderByBySort[filters.sort ?? 'UPDATED_DESC'],
    });
  }

  private async buildOrderWhere(
    filters: FindOrdersFilters = {},
  ): Promise<Prisma.TrackingOrderWhereInput | undefined> {
    const userSearch = filters.telegramChatId?.trim();
    const where: Prisma.TrackingOrderWhereInput = {
      carrier: filters.carrier,
      trackingNumber: filters.trackingNumber
        ? { contains: filters.trackingNumber }
        : undefined,
      finalStatus: filters.finalStatus,
      ...(filters.finalStatus || filters.includeCompleted ? {} : { isCompleted: false }),
    };
    const andFilters: Prisma.TrackingOrderWhereInput[] = [];

    if (filters.userId) {
      where.userId = filters.userId;
    } else if (filters.telegramUserId) {
      where.user = { telegramUserId: filters.telegramUserId };
    }

    if (userSearch) {
      const normalizedUsername = userSearch.replace(/^@/, '');
      const matchedUsers = await prisma.user.findMany({
        where: {
          OR: [
            { telegramUserId: { contains: userSearch } },
            ...(normalizedUsername
              ? [{ username: { contains: normalizedUsername } }]
              : []),
          ],
        },
        select: { telegramUserId: true },
        take: 500,
      });
      const matchedTelegramUserIds = [
        ...new Set(matchedUsers.map((user) => user.telegramUserId)),
      ];
      const userSearchFilters: Prisma.TrackingOrderWhereInput[] = [
        { telegramChatId: { contains: userSearch } },
        { user: { telegramUserId: { contains: userSearch } } },
      ];

      if (normalizedUsername) {
        userSearchFilters.push({ user: { username: { contains: normalizedUsername } } });
      }

      if (matchedTelegramUserIds.length > 0) {
        userSearchFilters.push({ telegramChatId: { in: matchedTelegramUserIds } });
      }

      andFilters.push({ OR: userSearchFilters });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    return Object.values(where).some((value) => value !== undefined) ? where : undefined;
  }

  findActiveOrders(): Promise<TrackingOrderEntity[]> {
    return prisma.trackingOrder.findMany({
      where: {
        isCompleted: false,
        OR: [
          { userId: null },
          { user: { isBlocked: false } },
        ],
      },
      include: trackingOrderInclude,
      orderBy: { updatedAt: 'asc' },
    });
  }

  findByTrackingNumber(
    trackingNumber: string,
    carrier: TrackingCarrier,
  ): Promise<TrackingOrderEntity | null> {
    return prisma.trackingOrder.findFirst({
      where: { carrier, trackingNumber },
      include: trackingOrderInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findByTrackingNumberAndChat(
    carrier: TrackingCarrier,
    trackingNumber: string,
    telegramChatId: string,
  ): Promise<TrackingOrderEntity | null> {
    return prisma.trackingOrder.findUnique({
      where: {
        carrier_trackingNumber_telegramChatId: {
          carrier,
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
          carrier: input.carrier,
          trackingNumber: input.trackingNumber,
          telegramChatId: input.telegramChatId,
          userId,
          note: input.note ?? null,
          trackingCredential: input.trackingCredential ?? null,
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

  updateOrderDetails(
    orderId: number,
    input: { note?: string | null; trackingCredential?: string | null },
  ): Promise<TrackingOrderEntity> {
    return prisma.trackingOrder.update({
      where: { id: orderId },
      data: {
        note: input.note,
        trackingCredential: input.trackingCredential,
      },
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
    carrier: TrackingCarrier,
    trackingNumber: string,
    telegramChatId: string,
  ): Promise<TrackingOrderEntity | null> {
    const order = await this.findByTrackingNumberAndChat(carrier, trackingNumber, telegramChatId);

    if (!order) {
      return null;
    }

    return prisma.trackingOrder.delete({ where: { id: order.id }, include: trackingOrderInclude });
  }

  findHistoriesByTrackingNumber(
    trackingNumber: string,
    carrier: TrackingCarrier,
  ): Promise<TrackingHistoryEntity[]> {
    return prisma.trackingHistory.findMany({
      where: {
        carrier,
        order: { carrier, trackingNumber },
      },
      orderBy: { eventTime: 'desc' },
    });
  }

  async listHistories(
    filters: ListHistoriesFilters = {},
  ): Promise<PaginatedRepositoryResult<TrackingHistoryWithOrderEntity>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const where = this.buildHistoryWhere(filters);
    const [data, total] = await prisma.$transaction([
      prisma.trackingHistory.findMany({
        where,
        include: {
          order: {
            select: trackingHistoryOrderSelect,
          },
        },
        orderBy: historyOrderByBySort[filters.sort ?? 'EVENT_DESC'],
        ...getPaginationArgs({ page, limit }),
      }),
      prisma.trackingHistory.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private buildHistoryWhere(
    filters: ListHistoriesFilters,
  ): Prisma.TrackingHistoryWhereInput | undefined {
    if (
      !filters.carrier &&
      !filters.trackingNumber &&
      !filters.telegramChatId &&
      !filters.userId &&
      !filters.telegramUserId
    ) {
      return undefined;
    }

    return {
      carrier: filters.carrier,
      order: {
        carrier: filters.carrier,
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
    };
  }

  private toHistoryCreateInput(
    orderId: number,
    latestRecord: NormalizedTrackingRecord,
  ) {
    return {
      orderId,
      carrier: latestRecord.carrier,
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
