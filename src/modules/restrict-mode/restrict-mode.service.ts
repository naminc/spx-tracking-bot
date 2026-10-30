import { env } from '../../config/env';
import { logger } from '../../shared/logger/logger';
import {
  RestrictModeRepository,
  restrictModeRepository,
} from './restrict-mode.repository';

const CACHE_TTL_MS = 15_000;
const DEFAULT_RESTRICTION_MESSAGE =
  'Bot hiện không khả dụng. Vui lòng liên hệ admin để biết thêm thông tin.';

type RestrictModeSnapshot = {
  enabled: boolean;
  message: string;
  allowedTelegramUserIds: Set<string>;
};

export type RestrictAccessResult =
  | { restricted: false }
  | { restricted: true; message: string };

const getConfiguredAdminTelegramIds = (): Set<string> =>
  new Set(
    env.ADMIN_TELEGRAM_ADMINS.split(',')
      .map((entry) => entry.trim().split(':')[0]?.trim())
      .filter((telegramUserId): telegramUserId is string => Boolean(telegramUserId)),
  );

export class RestrictModeService {
  private snapshot: RestrictModeSnapshot | null = null;
  private snapshotExpiresAt = 0;
  private readonly adminTelegramUserIds = getConfiguredAdminTelegramIds();

  constructor(
    private readonly repository: RestrictModeRepository = restrictModeRepository,
  ) {}

  async checkTelegramAccess(telegramUserId: string): Promise<RestrictAccessResult> {
    const normalizedTelegramUserId = telegramUserId.trim();

    if (this.adminTelegramUserIds.has(normalizedTelegramUserId)) {
      return { restricted: false };
    }

    const snapshot = await this.getSnapshot();

    if (
      !snapshot.enabled ||
      snapshot.allowedTelegramUserIds.has(normalizedTelegramUserId)
    ) {
      return { restricted: false };
    }

    return {
      restricted: true,
      message: snapshot.message,
    };
  }

  async canUseBot(telegramUserId: string): Promise<boolean> {
    return !(await this.checkTelegramAccess(telegramUserId)).restricted;
  }

  async filterAllowedTelegramUserIds(telegramUserIds: string[]): Promise<Set<string>> {
    const uniqueIds = [...new Set(telegramUserIds.map((id) => id.trim()).filter(Boolean))];
    const snapshot = await this.getSnapshot();

    if (!snapshot.enabled) {
      return new Set(uniqueIds);
    }

    return new Set(
      uniqueIds.filter(
        (id) =>
          this.adminTelegramUserIds.has(id) || snapshot.allowedTelegramUserIds.has(id),
      ),
    );
  }

  invalidateCache(): void {
    this.snapshot = null;
    this.snapshotExpiresAt = 0;
  }

  private async getSnapshot(): Promise<RestrictModeSnapshot> {
    if (this.snapshot && Date.now() < this.snapshotExpiresAt) {
      return this.snapshot;
    }

    try {
      const result = await this.repository.getSnapshot();
      const message = result.setting?.restrictModeMessage?.trim();

      this.snapshot = {
        enabled: result.setting?.restrictModeEnabled ?? false,
        message: message || DEFAULT_RESTRICTION_MESSAGE,
        allowedTelegramUserIds: new Set(
          result.allowList.map((entry) => entry.telegramUserId),
        ),
      };
      this.snapshotExpiresAt = Date.now() + CACHE_TTL_MS;
      return this.snapshot;
    } catch (error) {
      logger.error({ err: error }, 'Failed to load Restrict Mode configuration');

      if (this.snapshot) {
        return this.snapshot;
      }

      this.snapshot = {
        enabled: true,
        message: DEFAULT_RESTRICTION_MESSAGE,
        allowedTelegramUserIds: new Set(),
      };
      this.snapshotExpiresAt = Date.now() + 5_000;
      return this.snapshot;
    }
  }
}

export const restrictModeService = new RestrictModeService();
