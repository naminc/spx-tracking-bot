import type { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/prisma/client';

const SETTINGS_ID = 1;

export type AppSettingEntity = Prisma.AppSettingGetPayload<Record<string, never>>;
export type RestrictAllowListEntryEntity =
  Prisma.BotRestrictAllowListEntryGetPayload<Record<string, never>>;

export type SettingWithAllowList = {
  setting: AppSettingEntity;
  restrictAllowList: RestrictAllowListEntryEntity[];
};

type UpdateSettingInput = {
  adminContact: string;
  maintenanceEnabled: boolean;
  restrictModeEnabled: boolean;
  restrictModeMessage: string | null;
  restrictAllowedTelegramUserIds: string[];
};

export class SettingRepository {
  find() {
    return prisma.appSetting.findUnique({
      where: { id: SETTINGS_ID },
    });
  }

  listRestrictAllowList() {
    return prisma.botRestrictAllowListEntry.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  createDefault(adminContact: string) {
    return prisma.appSetting.create({
      data: {
        id: SETTINGS_ID,
        adminContact,
        maintenanceEnabled: false,
        restrictModeEnabled: false,
        restrictModeMessage: null,
      },
    });
  }

  async update(input: UpdateSettingInput): Promise<SettingWithAllowList> {
    return prisma.$transaction(async (transaction) => {
      const setting = await transaction.appSetting.upsert({
        where: { id: SETTINGS_ID },
        create: {
          id: SETTINGS_ID,
          adminContact: input.adminContact,
          maintenanceEnabled: input.maintenanceEnabled,
          restrictModeEnabled: input.restrictModeEnabled,
          restrictModeMessage: input.restrictModeMessage,
        },
        update: {
          adminContact: input.adminContact,
          maintenanceEnabled: input.maintenanceEnabled,
          restrictModeEnabled: input.restrictModeEnabled,
          restrictModeMessage: input.restrictModeMessage,
        },
      });

      if (input.restrictAllowedTelegramUserIds.length === 0) {
        await transaction.botRestrictAllowListEntry.deleteMany();
      } else {
        await transaction.botRestrictAllowListEntry.deleteMany({
          where: {
            telegramUserId: { notIn: input.restrictAllowedTelegramUserIds },
          },
        });
        await transaction.botRestrictAllowListEntry.createMany({
          data: input.restrictAllowedTelegramUserIds.map((telegramUserId) => ({
            telegramUserId,
          })),
          skipDuplicates: true,
        });
      }

      const restrictAllowList =
        await transaction.botRestrictAllowListEntry.findMany({
          orderBy: { createdAt: 'asc' },
        });

      return { setting, restrictAllowList };
    });
  }
}

export const settingRepository = new SettingRepository();
