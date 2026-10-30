import { env } from '../../../config/env';
import { logger } from '../../../shared/logger/logger';
import {
  restrictModeService,
  type RestrictModeService,
} from '../../restrict-mode/restrict-mode.service';
import {
  type AppSettingEntity,
  type RestrictAllowListEntryEntity,
  SettingRepository,
  settingRepository,
} from './setting.repository';
import type { UpdateSettingInput } from './setting.schema';

export type AppSettingDto = {
  adminContact: string;
  maintenanceEnabled: boolean;
  restrictModeEnabled: boolean;
  restrictModeMessage: string | null;
  restrictAllowList: Array<{
    id: number;
    telegramUserId: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

const toDto = (
  setting: AppSettingEntity,
  restrictAllowList: RestrictAllowListEntryEntity[],
): AppSettingDto => ({
  adminContact: setting.adminContact,
  maintenanceEnabled: setting.maintenanceEnabled,
  restrictModeEnabled: setting.restrictModeEnabled,
  restrictModeMessage: setting.restrictModeMessage,
  restrictAllowList: restrictAllowList.map((entry) => ({
    id: entry.id,
    telegramUserId: entry.telegramUserId,
    createdAt: entry.createdAt,
  })),
  createdAt: setting.createdAt,
  updatedAt: setting.updatedAt,
});

export class SettingService {
  constructor(
    private readonly repository: SettingRepository = settingRepository,
    private readonly restrictMode: RestrictModeService = restrictModeService,
  ) {}

  async getSettings(): Promise<AppSettingDto> {
    const existing = await this.repository.find();
    const setting =
      existing ?? (await this.repository.createDefault(env.TELEGRAM_ADMIN_USERNAME));
    const restrictAllowList = await this.repository.listRestrictAllowList();

    return toDto(setting, restrictAllowList);
  }

  async updateSettings(
    input: UpdateSettingInput,
    admin?: { telegramId: string; username: string | null },
  ): Promise<AppSettingDto> {
    const result = await this.repository.update({
      adminContact: input.adminContact.trim(),
      maintenanceEnabled: input.maintenanceEnabled,
      restrictModeEnabled: input.restrictModeEnabled,
      restrictModeMessage: input.restrictModeMessage,
      restrictAllowedTelegramUserIds: input.restrictAllowedTelegramUserIds,
    });

    this.restrictMode.invalidateCache();
    logger.info(
      {
        restrictModeEnabled: input.restrictModeEnabled,
        restrictAllowListCount: result.restrictAllowList.length,
        adminTelegramId: admin?.telegramId,
        adminUsername: admin?.username,
      },
      'Admin settings updated',
    );

    return toDto(result.setting, result.restrictAllowList);
  }

  async getAdminContact(): Promise<string> {
    return (await this.getSettings()).adminContact;
  }

  async isMaintenanceEnabled(): Promise<boolean> {
    return (await this.getSettings()).maintenanceEnabled;
  }
}

export const settingService = new SettingService();
