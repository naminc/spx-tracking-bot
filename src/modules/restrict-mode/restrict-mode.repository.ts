import { prisma } from '../../shared/prisma/client';

const SETTINGS_ID = 1;

export class RestrictModeRepository {
  async getSnapshot() {
    const [setting, allowList] = await prisma.$transaction([
      prisma.appSetting.findUnique({
        where: { id: SETTINGS_ID },
        select: {
          restrictModeEnabled: true,
          restrictModeMessage: true,
        },
      }),
      prisma.botRestrictAllowListEntry.findMany({
        select: { telegramUserId: true },
      }),
    ]);

    return { setting, allowList };
  }
}

export const restrictModeRepository = new RestrictModeRepository();
