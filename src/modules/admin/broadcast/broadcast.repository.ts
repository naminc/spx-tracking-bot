import {
  BroadcastRecipientStatus,
  BroadcastStatus,
  type Prisma,
} from '@prisma/client';
import { prisma } from '../../../shared/prisma/client';
import type { BroadcastTargetType } from './broadcast.schema';

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

const recipientInclude = {
  user: { select: userSelect },
} satisfies Prisma.BroadcastRecipientInclude;

const broadcastDetailInclude = {
  recipients: {
    include: recipientInclude,
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.BroadcastInclude;

export type BroadcastEntity = Prisma.BroadcastGetPayload<Record<string, never>>;
export type BroadcastDetailEntity = Prisma.BroadcastGetPayload<{
  include: typeof broadcastDetailInclude;
}>;
export type BroadcastRecipientEntity = Prisma.BroadcastRecipientGetPayload<{
  include: typeof recipientInclude;
}>;

type CreateBroadcastInput = {
  title: string | null;
  message: string;
  targetType: BroadcastTargetType;
  recipients: {
    userId: number;
    telegramUserId: string;
  }[];
};

type RecipientStatusCounts = {
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  totalCount: number;
};

export class BroadcastRepository {
  listBroadcasts(): Promise<BroadcastEntity[]> {
    return prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findBroadcastById(id: number): Promise<BroadcastDetailEntity | null> {
    return prisma.broadcast.findUnique({
      where: { id },
      include: broadcastDetailInclude,
    });
  }

  findUsersForBroadcast(targetType: BroadcastTargetType, userIds: number[] = []) {
    return prisma.user.findMany({
      where:
        targetType === 'ALL_USERS'
          ? { telegramUserId: { not: '' } }
          : { id: { in: userIds }, telegramUserId: { not: '' } },
      select: userSelect,
      orderBy: { id: 'asc' },
    });
  }

  async createBroadcast(input: CreateBroadcastInput): Promise<BroadcastDetailEntity> {
    return prisma.$transaction(async (transaction) => {
      const broadcast = await transaction.broadcast.create({
        data: {
          title: input.title,
          message: input.message,
          targetType: input.targetType,
          totalCount: input.recipients.length,
          recipients: {
            create: input.recipients.map((recipient) => ({
              userId: recipient.userId,
              telegramUserId: recipient.telegramUserId,
            })),
          },
        },
        select: { id: true },
      });

      const createdBroadcast = await transaction.broadcast.findUnique({
        where: { id: broadcast.id },
        include: broadcastDetailInclude,
      });

      if (!createdBroadcast) {
        throw new Error('Created broadcast not found');
      }

      return createdBroadcast;
    });
  }

  updateBroadcastStatus(
    id: number,
    status: BroadcastStatus,
  ): Promise<BroadcastEntity> {
    return prisma.broadcast.update({
      where: { id },
      data: { status },
    });
  }

  listRecipientsForSending(broadcastId: number): Promise<BroadcastRecipientEntity[]> {
    return prisma.broadcastRecipient.findMany({
      where: {
        broadcastId,
        status: { in: [BroadcastRecipientStatus.PENDING, BroadcastRecipientStatus.FAILED] },
      },
      include: recipientInclude,
      orderBy: { id: 'asc' },
    });
  }

  markRecipientSent(id: number, sentAt: Date): Promise<BroadcastRecipientEntity> {
    return prisma.broadcastRecipient.update({
      where: { id },
      data: {
        status: BroadcastRecipientStatus.SENT,
        sentAt,
        errorMessage: null,
      },
      include: recipientInclude,
    });
  }

  markRecipientFailed(
    id: number,
    errorMessage: string,
  ): Promise<BroadcastRecipientEntity> {
    return prisma.broadcastRecipient.update({
      where: { id },
      data: {
        status: BroadcastRecipientStatus.FAILED,
        errorMessage,
      },
      include: recipientInclude,
    });
  }

  async countRecipientStatuses(broadcastId: number): Promise<RecipientStatusCounts> {
    const groups = await prisma.broadcastRecipient.groupBy({
      by: ['status'],
      where: { broadcastId },
      _count: { _all: true },
    });

    return groups.reduce<RecipientStatusCounts>(
      (result, group) => {
        result.totalCount += group._count._all;

        if (group.status === BroadcastRecipientStatus.SENT) {
          result.sentCount = group._count._all;
        }

        if (group.status === BroadcastRecipientStatus.FAILED) {
          result.failedCount = group._count._all;
        }

        if (group.status === BroadcastRecipientStatus.PENDING) {
          result.pendingCount = group._count._all;
        }

        return result;
      },
      { sentCount: 0, failedCount: 0, pendingCount: 0, totalCount: 0 },
    );
  }

  async finalizeBroadcast(
    id: number,
    input: RecipientStatusCounts & { status: BroadcastStatus; sentAt: Date },
  ): Promise<BroadcastDetailEntity> {
    return prisma.broadcast.update({
      where: { id },
      data: {
        status: input.status,
        totalCount: input.totalCount,
        sentCount: input.sentCount,
        failedCount: input.failedCount,
        sentAt: input.sentAt,
      },
      include: broadcastDetailInclude,
    });
  }
}

export const broadcastRepository = new BroadcastRepository();
