import { BroadcastStatus } from '@prisma/client';
import { AppError } from '../../../shared/errors/app-error';
import { telegramService } from '../../telegram/telegram.service';
import {
  BroadcastDetailEntity,
  BroadcastRepository,
  broadcastRepository,
} from './broadcast.repository';
import type { CreateBroadcastInput } from './broadcast.schema';

const SEND_DELAY_MS = 200;
const MAX_ERROR_MESSAGE_LENGTH = 512;

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
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_MESSAGE_LENGTH);
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
      try {
        const sentAt = new Date();
        await telegramService.sendMessageOrThrow(recipient.telegramUserId, message);
        await this.repository.markRecipientSent(recipient.id, sentAt);
      } catch (error) {
        await this.repository.markRecipientFailed(recipient.id, toErrorMessage(error));
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

  private buildTelegramMessage(title: string | null, message: string): string {
    const escapedMessage = escapeHtml(message);

    if (!title) {
      return escapedMessage;
    }

    return `<b>${escapeHtml(title)}</b>\n\n${escapedMessage}`;
  }
}

export const broadcastService = new BroadcastService();
