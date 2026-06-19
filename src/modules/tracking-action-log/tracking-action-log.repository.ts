import {
  TrackingOrderActionSource,
  TrackingOrderActionType,
  type Prisma,
} from '@prisma/client';
import { prisma } from '../../shared/prisma/client';

const userSelect = {
  id: true,
  telegramUserId: true,
  username: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const orderSelect = {
  id: true,
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
  action?: TrackingOrderActionType;
  source?: TrackingOrderActionSource;
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: number;
  limit?: number;
};

export class TrackingOrderActionLogRepository {
  createLog(
    input: CreateTrackingOrderActionLogInput,
  ): Promise<TrackingOrderActionLogEntity> {
    return prisma.trackingOrderActionLog.create({
      data: {
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

  listLogs(
    filters: FindTrackingOrderActionLogsFilters = {},
  ): Promise<TrackingOrderActionLogEntity[]> {
    const where: Prisma.TrackingOrderActionLogWhereInput = {
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

    return prisma.trackingOrderActionLog.findMany({
      where,
      include: actionLogInclude,
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
    });
  }
}

export const trackingOrderActionLogRepository = new TrackingOrderActionLogRepository();
