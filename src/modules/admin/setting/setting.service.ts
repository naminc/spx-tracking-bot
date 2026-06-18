import { env } from '../../../config/env';
import {
  AppSettingEntity,
  SettingRepository,
  settingRepository,
} from './setting.repository';

export type AppSettingDto = {
  adminContact: string;
  maintenanceEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const toDto = (setting: AppSettingEntity): AppSettingDto => ({
  adminContact: setting.adminContact,
  maintenanceEnabled: setting.maintenanceEnabled,
  createdAt: setting.createdAt,
  updatedAt: setting.updatedAt,
});

export class SettingService {
  constructor(private readonly repository: SettingRepository = settingRepository) {}

  async getSettings(): Promise<AppSettingDto> {
    const existing = await this.repository.find();
    if (existing) {
      return toDto(existing);
    }

    return toDto(await this.repository.createDefault(env.TELEGRAM_ADMIN_USERNAME));
  }

  async updateSettings(input: {
    adminContact: string;
    maintenanceEnabled: boolean;
  }): Promise<AppSettingDto> {
    return toDto(
      await this.repository.update({
        adminContact: input.adminContact.trim(),
        maintenanceEnabled: input.maintenanceEnabled,
      }),
    );
  }

  async getAdminContact(): Promise<string> {
    return (await this.getSettings()).adminContact;
  }

  async isMaintenanceEnabled(): Promise<boolean> {
    return (await this.getSettings()).maintenanceEnabled;
  }
}

export const settingService = new SettingService();
