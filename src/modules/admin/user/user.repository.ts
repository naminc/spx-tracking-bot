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
}

export const userRepository = new UserRepository();
