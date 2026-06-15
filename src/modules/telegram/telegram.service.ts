import axios, { AxiosError } from 'axios';
import { env } from '../../config/env';
import { logger } from '../../shared/logger/logger';
import { FinalStatus } from '../tracking/final-status';
import { trackingNumberSchema } from '../tracking/tracking.schema';
import {
  TrackingNotification,
  TrackingService,
  trackingService,
} from '../tracking/tracking.service';
import { telegramMessageBuilder } from './telegram-message.builder';
import type {
  TelegramGetUpdatesResponse,
  TelegramInlineKeyboardMarkup,
  TelegramUpdate,
} from './telegram.types';

type SendMessageOptions = {
  replyMarkup?: TelegramInlineKeyboardMarkup;
};

export class TelegramService {
  private isPolling = false;
  private pollingOffset = 0;
  private readonly startMenuReplyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '➕ Thêm đơn hàng', callback_data: 'start:add' },
        { text: '🗑️ Xoá đơn hàng', callback_data: 'start:remove' },
      ],
      [{ text: '📦 Danh sách đơn hàng', callback_data: 'start:list' }],
    ],
  };
  private readonly backToStartMenuReplyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [[{ text: '⬅️ Quay lại menu', callback_data: 'start:menu' }]],
  };

  constructor(private readonly service: TrackingService = trackingService) {}

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
      return;
    }

    const message = update.message;

    if (!message?.text) {
      return;
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const command = text.split(/\s+/)[0].split('@')[0];

    if (command === '/start') {
      await this.sendStartMessage(chatId);
      return;
    }

    if (command === '/add') {
      await this.handleAdd(chatId, text);
      return;
    }

    if (command === '/list') {
      await this.sendOrderList(chatId);
      return;
    }

    if (command === '/contact') {
      await this.sendMessage(chatId, telegramMessageBuilder.contact(env.TELEGRAM_ADMIN_USERNAME));
      return;
    }

    if (command === '/remove') {
      await this.handleRemove(chatId, text);
      return;
    }

    if (/^SPXVN[A-Z0-9]+$/i.test(text)) {
      await this.sendMessage(chatId, telegramMessageBuilder.directTrackingNumberNotAllowed(text));
      return;
    }

    await this.sendMessage(chatId, telegramMessageBuilder.unknownCommand());
  }

  async sendTrackingNotification(notification: TrackingNotification): Promise<void> {
    if (notification.chatId === 'api') {
      return;
    }

    if (notification.finalStatus === FinalStatus.DELIVERED) {
      await this.sendMessage(notification.chatId, telegramMessageBuilder.delivered(notification));
      return;
    }

    if (notification.finalStatus === FinalStatus.FAILED) {
      await this.sendMessage(notification.chatId, telegramMessageBuilder.failed(notification));
      return;
    }

    if (notification.finalStatus === FinalStatus.CANCELLED) {
      await this.sendMessage(notification.chatId, telegramMessageBuilder.cancelled(notification));
      return;
    }

    await this.sendMessage(notification.chatId, telegramMessageBuilder.update(notification));
  }

  async sendMessage(chatId: string, text: string, options: SendMessageOptions = {}): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      logger.warn({ chatId }, 'TELEGRAM_BOT_TOKEN is empty; skipped Telegram send');
      return;
    }

    try {
      await axios.post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: options.replyMarkup,
      });
    } catch (error) {
      logger.error({ err: error, chatId }, 'Failed to send Telegram message');
    }
  }

  async startPolling(): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      logger.warn('TELEGRAM_BOT_TOKEN is empty; Telegram polling is disabled');
      return;
    }

    if (this.isPolling) {
      return;
    }

    await this.deleteWebhook();
    this.isPolling = true;
    logger.info('Telegram polling started');
    void this.pollUpdates();
  }

  stopPolling(): void {
    this.isPolling = false;
  }

  private async deleteWebhook(): Promise<void> {
    try {
      await axios.post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/deleteWebhook`, {
        drop_pending_updates: false,
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete Telegram webhook before polling');
    }
  }

  private async pollUpdates(): Promise<void> {
    while (this.isPolling) {
      try {
        const response = await axios.get<TelegramGetUpdatesResponse>(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUpdates`,
          {
            params: {
              offset: this.pollingOffset || undefined,
              timeout: env.TELEGRAM_POLLING_TIMEOUT_SECONDS,
              allowed_updates: JSON.stringify(['message', 'callback_query']),
            },
            timeout: (env.TELEGRAM_POLLING_TIMEOUT_SECONDS + 5) * 1000,
          },
        );

        for (const update of response.data.result) {
          this.pollingOffset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (error) {
        logger.error(this.toSafeTelegramErrorLog(error), 'Telegram polling failed');
        await this.sleep(3000);
      }
    }
  }

  private toSafeTelegramErrorLog(error: unknown): Record<string, unknown> {
    if (error instanceof AxiosError) {
      return {
        err: {
          name: error.name,
          message: error.message,
          code: error.code,
          status: error.response?.status,
        },
      };
    }

    return { err: error };
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  private async sendStartMessage(chatId: string): Promise<void> {
    await this.sendMessage(chatId, telegramMessageBuilder.start(), {
      replyMarkup: this.startMenuReplyMarkup,
    });
  }

  private async handleCallbackQuery(
    callbackQuery: NonNullable<TelegramUpdate['callback_query']>,
  ): Promise<void> {
    const chatId = callbackQuery.message?.chat.id ? String(callbackQuery.message.chat.id) : undefined;

    await this.answerCallbackQuery(callbackQuery.id);

    if (!chatId || !callbackQuery.data) {
      return;
    }

    if (callbackQuery.data === 'start:menu') {
      await this.sendStartMessage(chatId);
      return;
    }

    if (callbackQuery.data === 'start:add') {
      await this.sendMessage(chatId, telegramMessageBuilder.addInstruction(), {
        replyMarkup: this.backToStartMenuReplyMarkup,
      });
      return;
    }

    if (callbackQuery.data === 'start:remove') {
      await this.sendMessage(chatId, telegramMessageBuilder.removeMissingTrackingNumber(), {
        replyMarkup: this.backToStartMenuReplyMarkup,
      });
      return;
    }

    if (callbackQuery.data === 'start:list') {
      await this.sendOrderList(chatId, {
        replyMarkup: this.backToStartMenuReplyMarkup,
      });
    }
  }

  private async answerCallbackQuery(callbackQueryId: string): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return;
    }

    try {
      await axios.post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
      });
    } catch (error) {
      logger.error(this.toSafeTelegramErrorLog(error), 'Failed to answer Telegram callback query');
    }
  }

  private async handleAdd(chatId: string, text: string): Promise<void> {
    const [, rawTrackingNumber] = text.split(/\s+/);

    if (!rawTrackingNumber) {
      await this.sendMessage(chatId, telegramMessageBuilder.addInstruction());
      return;
    }

    const parsed = trackingNumberSchema.safeParse(rawTrackingNumber);

    if (!parsed.success) {
      await this.sendMessage(chatId, telegramMessageBuilder.invalidTrackingNumber());
      return;
    }

    try {
      const alreadyExists = await this.service.hasOrder(parsed.data, chatId);

      if (alreadyExists) {
        await this.sendMessage(chatId, telegramMessageBuilder.alreadyExists(parsed.data));
        return;
      }

      await this.sendMessage(chatId, telegramMessageBuilder.checking(parsed.data));
      const result = await this.service.addOrder(parsed.data, chatId);
      await this.sendMessage(chatId, telegramMessageBuilder.addSuccess(result));

      if (result.order.finalStatus !== FinalStatus.PENDING) {
        await this.sendTrackingNotification({
          chatId,
          trackingNumber: result.order.trackingNumber,
          status: result.order.currentStatus,
          trackingCode: result.latestRecord.trackingCode,
          location: result.latestRecord.location,
          nextLocation: result.latestRecord.nextLocation,
          milestoneName: result.latestRecord.milestoneName,
          eventTime: result.order.lastEventTime,
          finalStatus: result.order.finalStatus,
        });
      }
    } catch (error) {
      logger.error({ err: error, chatId, rawTrackingNumber: parsed.data }, 'Failed to add Telegram tracking order');
      await this.sendMessage(chatId, telegramMessageBuilder.spxError(parsed.data));
    }
  }

  private async handleRemove(chatId: string, text: string): Promise<void> {
    const [, rawTrackingNumber] = text.split(/\s+/);

    if (!rawTrackingNumber) {
      await this.sendMessage(chatId, telegramMessageBuilder.removeMissingTrackingNumber());
      return;
    }

    const parsed = trackingNumberSchema.safeParse(rawTrackingNumber);

    if (!parsed.success) {
      await this.sendMessage(chatId, telegramMessageBuilder.invalidTrackingNumber());
      return;
    }

    try {
      await this.service.removeOrder(parsed.data, chatId);
      await this.sendMessage(chatId, telegramMessageBuilder.removeSuccess(parsed.data));
    } catch (error) {
      logger.error({ err: error, chatId, rawTrackingNumber }, 'Failed to remove Telegram tracking order');
      await this.sendMessage(chatId, telegramMessageBuilder.invalidTrackingNumber());
    }
  }

  private async sendOrderList(chatId: string, options: SendMessageOptions = {}): Promise<void> {
    const orders = await this.service.listOrders(chatId, false);

    await this.sendMessage(
      chatId,
      orders.length > 0 ? telegramMessageBuilder.list(orders) : telegramMessageBuilder.emptyList(),
      options,
    );
  }
}

export const telegramService = new TelegramService();
