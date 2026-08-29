import type { Prisma } from '@prisma/client';
import { env } from '../../../config/env';
import { prisma } from '../../../shared/prisma/client';
import type { ListUsersQuery } from './user.schema';

export type UserEntity = Awaited<ReturnType<typeof prisma.user.findMany>>[number];
type UserWithOrderCountEntity = Prisma.UserGetPayload<{
  include: { _count: { select: { orders: true } } };
}>;
export type UserListEntity = Omit<UserWithOrderCountEntity, '_count'> & {
  ordersCount: number;
};

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

export type ClearZeroOrderUsersResult = {
  deletedCount: number;
  deletedUserIds: number[];
  deletedTelegramUserIds: string[];
};

export type ZeroOrderUsersPreview = {
  count: number;
  users: UserListEntity[];
};

const userOrderByBySort: Record<ListUsersQuery['sort'], Prisma.UserOrderByWithRelationInput[]> = {
  CREATED_DESC: [{ createdAt: 'desc' }],
  ORDERS_DESC: [{ orders: { _count: 'desc' } }, { createdAt: 'desc' }],
  ORDERS_ASC: [{ orders: { _count: 'asc' } }, { createdAt: 'desc' }],
};

const userOrderCountInclude = {
  _count: {
    select: {
      orders: true,
    },
  },
} satisfies Prisma.UserInclude;

const toUserListEntity = (user: UserWithOrderCountEntity): UserListEntity => {
  const { _count, ...rest } = user;

  return {
    ...rest,
    ordersCount: _count.orders,
  };
};

const getAdminTelegramUserIds = (): string[] =>
  env.ADMIN_TELEGRAM_ADMINS.split(',')
    .map((item) => item.trim().split(':')[0]?.trim())
    .filter((telegramUserId): telegramUserId is string => Boolean(telegramUserId));

const buildZeroOrderUserWhere = (): Prisma.UserWhereInput => {
  const adminTelegramUserIds = getAdminTelegramUserIds();

  return {
    orders: { none: {} },
    ...(adminTelegramUserIds.length > 0
      ? { telegramUserId: { notIn: adminTelegramUserIds } }
      : {}),
  };
};

export class UserRepository {
  async listUsers(filters: Partial<ListUsersQuery> = {}): Promise<UserListEntity[]> {
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

    const users = await prisma.user.findMany({
      where: andFilters.length > 0 ? { AND: andFilters } : undefined,
      include: userOrderCountInclude,
      orderBy: userOrderByBySort[filters.sort ?? 'CREATED_DESC'],
    });

    return users.map(toUserListEntity);
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

  async previewZeroOrderUsers(): Promise<ZeroOrderUsersPreview> {
    const users = await prisma.user.findMany({
      where: buildZeroOrderUserWhere(),
      include: userOrderCountInclude,
      orderBy: { createdAt: 'desc' },
    });

    const mappedUsers = users.map(toUserListEntity);

    return {
      count: mappedUsers.length,
      users: mappedUsers,
    };
  }

  async clearZeroOrderUsers(): Promise<ClearZeroOrderUsersResult> {
    return prisma.$transaction(async (transaction) => {
      const users = await transaction.user.findMany({
        where: buildZeroOrderUserWhere(),
        select: { id: true, telegramUserId: true },
      });
      const deletedUserIds = users.map((user) => user.id);
      const deletedTelegramUserIds = users.map((user) => user.telegramUserId);

      if (deletedUserIds.length === 0) {
        return {
          deletedCount: 0,
          deletedUserIds,
          deletedTelegramUserIds,
        };
      }

      await transaction.trackingOrderActionLog.updateMany({
        where: { userId: { in: deletedUserIds } },
        data: { userId: null },
      });

      await transaction.broadcastRecipient.updateMany({
        where: { userId: { in: deletedUserIds } },
        data: { userId: null },
      });

      const deleted = await transaction.user.deleteMany({
        where: {
          id: { in: deletedUserIds },
          orders: { none: {} },
        },
      });

      return {
        deletedCount: deleted.count,
        deletedUserIds,
        deletedTelegramUserIds,
      };
    });
  }
}

export const userRepository = new UserRepository();
