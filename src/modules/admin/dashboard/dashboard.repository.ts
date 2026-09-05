import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/prisma/client';
import { FinalStatus } from '../../tracking/final-status';
import type { TrackingCarrier as TrackingCarrierType } from '../../tracking/tracking-carrier';

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

export type DashboardAnalyticsQueryInput = {
  fromUtc: Date;
  toExclusiveUtc: Date;
  carrier?: TrackingCarrierType;
};

export type DashboardActionAnalyticsRow = {
  eventDate: string | Date;
  carrier: TrackingCarrierType;
  source: 'TELEGRAM' | 'ADMIN';
  count: bigint | number;
};

export type DashboardOrderStatusAnalyticsRow = {
  eventDate: string | Date;
  carrier: TrackingCarrierType;
  finalStatus: FinalStatus;
  count: bigint | number;
};

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

  async getDailyActionAdds(
    input: DashboardAnalyticsQueryInput,
  ): Promise<DashboardActionAnalyticsRow[]> {
    const carrierFilter = input.carrier
      ? Prisma.sql`AND \`carrier\` = ${input.carrier}`
      : Prisma.empty;

    return prisma.$queryRaw<DashboardActionAnalyticsRow[]>(Prisma.sql`
      SELECT
        DATE_FORMAT(DATE_ADD(\`createdAt\`, INTERVAL 7 HOUR), '%Y-%m-%d') AS eventDate,
        \`carrier\` AS carrier,
        \`source\` AS source,
        COUNT(*) AS count
      FROM \`TrackingOrderActionLog\`
      WHERE
        \`action\` = 'ADD'
        AND \`createdAt\` >= ${input.fromUtc}
        AND \`createdAt\` < ${input.toExclusiveUtc}
        ${carrierFilter}
      GROUP BY eventDate, \`carrier\`, \`source\`
      ORDER BY eventDate ASC
    `);
  }

  async getDailyOrderStatusCounts(
    input: DashboardAnalyticsQueryInput,
  ): Promise<DashboardOrderStatusAnalyticsRow[]> {
    const carrierFilter = input.carrier
      ? Prisma.sql`AND \`carrier\` = ${input.carrier}`
      : Prisma.empty;

    return prisma.$queryRaw<DashboardOrderStatusAnalyticsRow[]>(Prisma.sql`
      SELECT
        DATE_FORMAT(
          DATE_ADD(
            CASE
              WHEN \`finalStatus\` = ${FinalStatus.PENDING} THEN \`createdAt\`
              ELSE \`lastEventTime\`
            END,
            INTERVAL 7 HOUR
          ),
          '%Y-%m-%d'
        ) AS eventDate,
        \`carrier\` AS carrier,
        \`finalStatus\` AS finalStatus,
        COUNT(*) AS count
      FROM \`TrackingOrder\`
      WHERE
        (
          (
            \`finalStatus\` = ${FinalStatus.PENDING}
            AND \`createdAt\` >= ${input.fromUtc}
            AND \`createdAt\` < ${input.toExclusiveUtc}
          )
          OR
          (
            \`finalStatus\` <> ${FinalStatus.PENDING}
            AND \`lastEventTime\` >= ${input.fromUtc}
            AND \`lastEventTime\` < ${input.toExclusiveUtc}
          )
        )
        ${carrierFilter}
      GROUP BY eventDate, \`carrier\`, \`finalStatus\`
      ORDER BY eventDate ASC
    `);
  }
}

export const dashboardRepository = new DashboardRepository();
