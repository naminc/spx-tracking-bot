import type { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/prisma/client';
import type { ListUsersQuery } from './user.schema';

export type UserEntity = Awaited<ReturnType<typeof prisma.user.findMany>>[number];

export type UpsertUserInput = {
  telegramUserId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type BlockUserInput = {
  reason?: string | null;
  blockedByAdminTelegramId?: string | null;
  blockedByAdminUsername?: string | null;
};

export type DeleteUsersResult = {
  deletedCount: number;
  deletedUserIds: number[];
  deletedTelegramUserIds: string[];
  notFoundUserIds: number[];
};

export class UserRepository {
  listUsers(filters: ListUsersQuery = {}): Promise<UserEntity[]> {
    const q = filters.q?.trim();
    const andFilters: Prisma.UserWhereInput[] = [];

    if (q) {
      andFilters.push({
        OR: [
          { telegramUserId: { contains: q } },
          { username: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
        ],
      });
    }

    if (filters.profile === 'HAS_PROFILE') {
      andFilters.push({
        OR: [
          { username: { not: null } },
          { firstName: { not: null } },
          { lastName: { not: null } },
        ],
      });
    }

    if (filters.profile === 'MISSING_PROFILE') {
      andFilters.push({
        username: null,
        firstName: null,
        lastName: null,
      });
    }

    return prisma.user.findMany({
      where: andFilters.length > 0 ? { AND: andFilters } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  upsertUser(input: UpsertUserInput): Promise<UserEntity> {
    return prisma.user.upsert({
      where: { telegramUserId: input.telegramUserId },
      create: {
        telegramUserId: input.telegramUserId,
        username: input.username ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
      },
      update: {
        username: input.username ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
      },
    });
  }

  findByTelegramUserId(telegramUserId: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({
      where: { telegramUserId },
    });
  }

  findById(id: number): Promise<UserEntity | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  blockUser(id: number, input: BlockUserInput): Promise<UserEntity> {
    return prisma.user.update({
      where: { id },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: input.reason ?? null,
        blockedByAdminTelegramId: input.blockedByAdminTelegramId ?? null,
        blockedByAdminUsername: input.blockedByAdminUsername ?? null,
      },
    });
  }

  unblockUser(id: number): Promise<UserEntity> {
    return prisma.user.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedAt: null,
        blockedReason: null,
        blockedByAdminTelegramId: null,
        blockedByAdminUsername: null,
      },
    });
  }

  async deleteUsersByIds(
    userIds: number[],
    options: { matchTelegramUserIds?: boolean } = {},
  ): Promise<DeleteUsersResult> {
    const uniqueUserIds = [...new Set(userIds)];
    const maxPrismaInt = 2147483647;
    const idCandidates = uniqueUserIds.filter((userId) => userId <= maxPrismaInt);

    return prisma.$transaction(async (transaction) => {
      const usersById = await transaction.user.findMany({
        where: idCandidates.length > 0 ? { id: { in: idCandidates } } : { id: -1 },
        select: { id: true, telegramUserId: true },
      });
      const usersByIdSet = new Set(usersById.map((user) => user.id));
      const remainingIdentifiers = uniqueUserIds.filter((userId) => !usersByIdSet.has(userId));
      const usersByTelegramUserId = options.matchTelegramUserIds
        ? await transaction.user.findMany({
            where: { telegramUserId: { in: remainingIdentifiers.map(String) } },
            select: { id: true, telegramUserId: true },
          })
        : [];
      const existingUsers = [
        ...new Map([...usersById, ...usersByTelegramUserId].map((user) => [user.id, user])).values(),
      ];
      const existingIdSet = new Set(existingUsers.map((user) => user.id));
      const existingTelegramUserIdSet = new Set(existingUsers.map((user) => user.telegramUserId));
      const deletedUserIds = existingUsers.map((user) => user.id);
      const deletedTelegramUserIds = existingUsers.map((user) => user.telegramUserId);
      const notFoundUserIds = uniqueUserIds.filter(
        (userId) => !existingIdSet.has(userId) && !existingTelegramUserIdSet.has(String(userId)),
      );

      if (deletedUserIds.length === 0) {
        return {
          deletedCount: 0,
          deletedUserIds,
          deletedTelegramUserIds,
          notFoundUserIds,
        };
      }

      await transaction.trackingOrder.updateMany({
        where: { userId: { in: deletedUserIds } },
        data: { userId: null },
      });

      await transaction.trackingOrderActionLog.updateMany({
        where: { userId: { in: deletedUserIds } },
        data: { userId: null },
      });

      await transaction.broadcastRecipient.updateMany({
        where: { userId: { in: deletedUserIds } },
        data: { userId: null },
      });

      const deleted = await transaction.user.deleteMany({
        where: { id: { in: deletedUserIds } },
      });

      return {
        deletedCount: deleted.count,
        deletedUserIds,
        deletedTelegramUserIds,
        notFoundUserIds,
      };
    });
  }
}

export const userRepository = new UserRepository();
