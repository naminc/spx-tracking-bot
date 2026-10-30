export type RestrictAllowListEntry = {
  id: number;
  telegramUserId: string;
  createdAt: string;
};

export type AppSetting = {
  adminContact: string;
  maintenanceEnabled: boolean;
  restrictModeEnabled: boolean;
  restrictModeMessage: string | null;
  restrictAllowList: RestrictAllowListEntry[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateAppSettingInput = {
  adminContact: string;
  maintenanceEnabled: boolean;
  restrictModeEnabled: boolean;
  restrictModeMessage: string | null;
  restrictAllowedTelegramUserIds: string[];
};
