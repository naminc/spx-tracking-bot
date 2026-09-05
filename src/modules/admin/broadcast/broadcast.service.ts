import { BroadcastStatus } from '@prisma/client';
import { AxiosError } from 'axios';
import { AppError } from '../../../shared/errors/app-error';
import { telegramService } from '../../telegram/telegram.service';
import {
  BroadcastDetailEntity,
  BroadcastRepository,
  type BroadcastRecipientEntity,
  broadcastRepository,
} from './broadcast.repository';
import type {
  CreateBroadcastInput,
  FailedRecipientsExportQuery,
} from './broadcast.schema';

const SEND_DELAY_MS = 200;
const MAX_ERROR_MESSAGE_LENGTH = 512;

type BroadcastFailureReason =
  | 'BOT_BLOCKED'
  | 'CHAT_NOT_FOUND'
  | 'USER_DEACTIVATED'
  | 'TELEGRAM_PARSE_ERROR'
  | 'TELEGRAM_ERROR'
  | 'UNKNOWN';

type FailedRecipientsExportFile = {
  filename: string;
  contentType: string;
  body: string;
};

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as
      | { description?: unknown; message?: unknown }
      | undefined;
    const telegramDescription =
      typeof responseData?.description === 'string' ? responseData.description : undefined;
    const responseMessage =
      typeof responseData?.message === 'string' ? responseData.message : undefined;

    return (telegramDescription ?? responseMessage ?? error.message).slice(0, MAX_ERROR_MESSAGE_LENGTH);
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_MESSAGE_LENGTH);
};

const classifyFailureReason = (errorMessage: string | null): BroadcastFailureReason => {
  const normalizedMessage = (errorMessage ?? '').toLowerCase();

  if (!normalizedMessage) {
    return 'UNKNOWN';
  }

  if (normalizedMessage.includes('bot was blocked by the user')) {
    return 'BOT_BLOCKED';
  }

  if (normalizedMessage.includes('chat not found')) {
    return 'CHAT_NOT_FOUND';
  }

  if (normalizedMessage.includes('user is deactivated') || normalizedMessage.includes('deactivated')) {
    return 'USER_DEACTIVATED';
  }

  if (
    normalizedMessage.includes("can't parse entities") ||
    normalizedMessage.includes('cant parse entities') ||
    normalizedMessage.includes('parse entities')
  ) {
    return 'TELEGRAM_PARSE_ERROR';
  }

  return 'TELEGRAM_ERROR';
};

const matchesExportReason = (
  failureReason: BroadcastFailureReason,
  exportReason: FailedRecipientsExportQuery['reason'],
): boolean => {
  if (exportReason === 'all') return true;
  if (exportReason === 'bot_blocked') return failureReason === 'BOT_BLOCKED';
  if (exportReason === 'chat_not_found') return failureReason === 'CHAT_NOT_FOUND';
  if (exportReason === 'deactivated') return failureReason === 'USER_DEACTIVATED';
  if (exportReason === 'telegram_parse_error') return failureReason === 'TELEGRAM_PARSE_ERROR';
  if (exportReason === 'telegram_error') {
    return failureReason === 'TELEGRAM_ERROR' || failureReason === 'UNKNOWN';
  }
  if (exportReason === 'unreachable') {
    return ['BOT_BLOCKED', 'CHAT_NOT_FOUND', 'USER_DEACTIVATED'].includes(failureReason);
  }

  return false;
};

const toCsvValue = (value: unknown): string => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const buildCsv = (recipients: BroadcastRecipientEntity[]): string => {
  const header = [
    'userId',
    'telegramUserId',
    'username',
    'firstName',
    'lastName',
    'errorReason',
    'errorMessage',
    'failedAt',
  ];
  const rows = recipients.map((recipient) => {
    const failureReason = classifyFailureReason(recipient.errorMessage);

    return [
      recipient.userId ?? recipient.user?.id ?? '',
      recipient.telegramUserId,
      recipient.user?.username ?? '',
      recipient.user?.firstName ?? '',
      recipient.user?.lastName ?? '',
      failureReason,
      recipient.errorMessage ?? '',
      recipient.sentAt?.toISOString() ?? '',
    ].map(toCsvValue).join(',');
  });

  return [header.join(','), ...rows].join('\n');
};

export class BroadcastService {
  constructor(private readonly repository: BroadcastRepository = broadcastRepository) {}

  listBroadcasts() {
    return this.repository.listBroadcasts();
  }

  async getBroadcast(id: number): Promise<BroadcastDetailEntity> {
    const broadcast = await this.repository.findBroadcastById(id);

    if (!broadcast) {
      throw new AppError('Broadcast not found', 404);
    }

    return broadcast;
  }

  async createBroadcast(input: CreateBroadcastInput): Promise<BroadcastDetailEntity> {
    const uniqueUserIds = [...new Set(input.userIds)];
    const users = await this.repository.findUsersForBroadcast(input.targetType, uniqueUserIds);

    if (users.length === 0) {
      throw new AppError('No eligible Telegram users found for this broadcast', 400);
    }

    return this.repository.createBroadcast({
      title: input.title,
      message: input.message,
      targetType: input.targetType,
      recipients: users.map((user) => ({
        userId: user.id,
        telegramUserId: user.telegramUserId,
      })),
    });
  }

  async sendBroadcast(id: number): Promise<BroadcastDetailEntity> {
    const broadcast = await this.getBroadcast(id);

    if (
      broadcast.status !== BroadcastStatus.DRAFT &&
      broadcast.status !== BroadcastStatus.FAILED
    ) {
      throw new AppError('Only draft or failed broadcasts can be sent', 409);
    }

    await this.repository.updateBroadcastStatus(id, BroadcastStatus.SENDING);
    const recipients = await this.repository.listRecipientsForSending(id);
    const message = this.buildTelegramMessage(broadcast.title, broadcast.message);

    for (const recipient of recipients) {
      const attemptedAt = new Date();

      try {
        await telegramService.sendMessageOrThrow(recipient.telegramUserId, message);
        await this.repository.markRecipientSent(recipient.id, attemptedAt);
      } catch (error) {
        await this.repository.markRecipientFailed(recipient.id, toErrorMessage(error), attemptedAt);
      }

      await delay(SEND_DELAY_MS);
    }

    const counts = await this.repository.countRecipientStatuses(id);
    const finalStatus = counts.failedCount > 0 ? BroadcastStatus.FAILED : BroadcastStatus.SENT;

    return this.repository.finalizeBroadcast(id, {
      ...counts,
      status: finalStatus,
      sentAt: new Date(),
    });
  }

  async exportFailedRecipients(
    id: number,
    query: FailedRecipientsExportQuery,
  ): Promise<FailedRecipientsExportFile> {
    const broadcast = await this.repository.findBroadcastSummaryById(id);

    if (!broadcast) {
      throw new AppError('Broadcast not found', 404);
    }

    const failedRecipients = await this.repository.listFailedRecipients(id);
    const filteredRecipients = failedRecipients.filter((recipient) =>
      matchesExportReason(classifyFailureReason(recipient.errorMessage), query.reason),
    );
    const filename = `broadcast-${id}-failed-recipients.${query.format}`;

    if (query.format === 'csv') {
      return {
        filename,
        contentType: 'text/csv; charset=utf-8',
        body: `\uFEFF${buildCsv(filteredRecipients)}`,
      };
    }

    const body = filteredRecipients.map((recipient) => recipient.telegramUserId).join('\n');

    return {
      filename,
      contentType: 'text/plain; charset=utf-8',
      body: body ? `${body}\n` : '',
    };
  }

  private buildTelegramMessage(title: string | null, message: string): string {
    if (!title) {
      return message;
    }

    return `<b>${escapeHtml(title)}</b>\n\n${message}`;
  }
}

export const broadcastService = new BroadcastService();
