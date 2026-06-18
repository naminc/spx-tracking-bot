import { prisma } from '../../../shared/prisma/client';

export type UserEntity = Awaited<ReturnType<typeof prisma.user.findMany>>[number];

export type UpsertUserInput = {
  telegramUserId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export class UserRepository {
  listUsers(): Promise<UserEntity[]> {
    return prisma.user.findMany({
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
