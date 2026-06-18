import { prisma } from '../../../shared/prisma/client';

const SETTINGS_ID = 1;

export type AppSettingEntity = NonNullable<Awaited<ReturnType<SettingRepository['find']>>>;

export class SettingRepository {
  find() {
    return prisma.appSetting.findUnique({
      where: { id: SETTINGS_ID },
    });
  }

  createDefault(adminContact: string) {
    return prisma.appSetting.create({
      data: {
        id: SETTINGS_ID,
        adminContact,
        maintenanceEnabled: false,
      },
    });
  }

  update(input: { adminContact: string; maintenanceEnabled: boolean }) {
    return prisma.appSetting.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        adminContact: input.adminContact,
        maintenanceEnabled: input.maintenanceEnabled,
      },
      update: {
        adminContact: input.adminContact,
        maintenanceEnabled: input.maintenanceEnabled,
      },
    });
  }
}

export const settingRepository = new SettingRepository();
