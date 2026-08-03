import type { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/prisma/client';

const recentLimit = 8;

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

const trackingHistoryInclude = {
  order: {
    select: {
      carrier: true,
      trackingNumber: true,
      telegramChatId: true,
      userId: true,
      note: true,
      user: { select: userSelect },
    },
  },
} satisfies Prisma.TrackingHistoryInclude;

export type DashboardRecentOrderEntity = Prisma.TrackingOrderGetPayload<{
  include: typeof trackingOrderInclude;
}>;

export type DashboardRecentHistoryEntity = Prisma.TrackingHistoryGetPayload<{
  include: typeof trackingHistoryInclude;
}>;

export class DashboardRepository {
  async getOrderCounts() {
    const [total, active, completed, byFinalStatus] = await prisma.$transaction([
      prisma.trackingOrder.count(),
      prisma.trackingOrder.count({ where: { isCompleted: false } }),
      prisma.trackingOrder.count({ where: { isCompleted: true } }),
      prisma.trackingOrder.groupBy({
        by: ['finalStatus'],
        _count: { _all: true },
      }),
    ]);

    return { total, active, completed, byFinalStatus };
  }

  async getTrackingHistoryCount(): Promise<number> {
    return prisma.trackingHistory.count();
  }

  async getUserCount(): Promise<number> {
    return prisma.user.count();
  }

  async getRecentOrders(): Promise<DashboardRecentOrderEntity[]> {
    return prisma.trackingOrder.findMany({
      include: trackingOrderInclude,
      orderBy: { updatedAt: 'desc' },
      take: recentLimit,
    });
  }

  async getRecentHistories(): Promise<DashboardRecentHistoryEntity[]> {
    return prisma.trackingHistory.findMany({
      include: trackingHistoryInclude,
      orderBy: { eventTime: 'desc' },
      take: recentLimit,
    });
  }
}

export const dashboardRepository = new DashboardRepository();
