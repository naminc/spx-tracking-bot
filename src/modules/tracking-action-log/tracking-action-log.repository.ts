import {
  TrackingOrderActionSource,
  TrackingOrderActionType,
  type Prisma,
} from '@prisma/client';
import {
  getPaginationArgs,
  type PaginatedRepositoryResult,
  type PaginationInput,
} from '../../shared/pagination/pagination';
import { prisma } from '../../shared/prisma/client';
import type { TrackingCarrier } from '../tracking/tracking-carrier';

const userSelect = {
  id: true,
  telegramUserId: true,
  username: true,
  firstName: true,
  lastName: true,
  isBlocked: true,
  blockedAt: true,
  blockedReason: true,
  blockedByAdminTelegramId: true,
  blockedByAdminUsername: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const orderSelect = {
  id: true,
  carrier: true,
  trackingNumber: true,
  telegramChatId: true,
  userId: true,
} satisfies Prisma.TrackingOrderSelect;

const actionLogInclude = {
  user: { select: userSelect },
  order: { select: orderSelect },
} satisfies Prisma.TrackingOrderActionLogInclude;

export type TrackingOrderActionLogEntity = Prisma.TrackingOrderActionLogGetPayload<{
  include: typeof actionLogInclude;
}>;

export type CreateTrackingOrderActionLogInput = {
  carrier: TrackingCarrier;
  action: TrackingOrderActionType;
  source: TrackingOrderActionSource;
  trackingNumber: string;
  telegramChatId?: string | null;
  userId?: number | null;
  orderId?: number | null;
  adminTelegramId?: string | null;
  adminUsername?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export type FindTrackingOrderActionLogsFilters = {
  carrier?: TrackingCarrier;
  action?: TrackingOrderActionType;
  source?: TrackingOrderActionSource;
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: number;
  sort?: 'CREATED_DESC' | 'CREATED_ASC';
} & Partial<PaginationInput>;

const actionLogOrderByBySort: Record<
  NonNullable<FindTrackingOrderActionLogsFilters['sort']>,
  Prisma.TrackingOrderActionLogOrderByWithRelationInput[]
> = {
  CREATED_DESC: [{ createdAt: 'desc' }],
  CREATED_ASC: [{ createdAt: 'asc' }],
};

export class TrackingOrderActionLogRepository {
  createLog(
    input: CreateTrackingOrderActionLogInput,
  ): Promise<TrackingOrderActionLogEntity> {
    return prisma.trackingOrderActionLog.create({
      data: {
        carrier: input.carrier,
        action: input.action,
        source: input.source,
        trackingNumber: input.trackingNumber,
        telegramChatId: input.telegramChatId ?? null,
        userId: input.userId ?? null,
        orderId: input.orderId ?? null,
        adminTelegramId: input.adminTelegramId ?? null,
        adminUsername: input.adminUsername ?? null,
        metadata: input.metadata,
      },
      include: actionLogInclude,
    });
  }

  async listLogs(
    filters: FindTrackingOrderActionLogsFilters = {},
  ): Promise<PaginatedRepositoryResult<TrackingOrderActionLogEntity>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const where: Prisma.TrackingOrderActionLogWhereInput = {
      carrier: filters.carrier,
      action: filters.action,
      source: filters.source,
      trackingNumber: filters.trackingNumber
        ? { contains: filters.trackingNumber }
        : undefined,
      telegramChatId: filters.telegramChatId
        ? { contains: filters.telegramChatId }
        : undefined,
      userId: filters.userId,
    };

    const [data, total] = await prisma.$transaction([
      prisma.trackingOrderActionLog.findMany({
        where,
        include: actionLogInclude,
        orderBy: actionLogOrderByBySort[filters.sort ?? 'CREATED_DESC'],
        ...getPaginationArgs({ page, limit }),
      }),
      prisma.trackingOrderActionLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}

export const trackingOrderActionLogRepository = new TrackingOrderActionLogRepository();
