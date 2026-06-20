import axios, { AxiosError } from 'axios';
import { env } from '../../config/env';
import { logger } from '../../shared/logger/logger';
import { FinalStatus } from '../tracking/final-status';
import { MAX_ORDER_NOTE_LENGTH, trackingNumberSchema } from '../tracking/tracking.schema';
import {
  TrackingNotification,
  TrackingService,
  trackingService,
} from '../tracking/tracking.service';
import { SettingService, settingService } from '../admin/setting/setting.service';
import { UserRepository, userRepository } from '../admin/user/user.repository';
import {
  TrackingOrderActionSource,
  TrackingOrderActionType,
  trackingOrderActionLogService,
} from '../tracking-action-log/tracking-action-log.service';
import { telegramMessageBuilder } from './telegram-message.builder';
import type {
  TelegramCallbackQuery,
  TelegramGetUpdatesResponse,
  TelegramInlineKeyboardMarkup,
  TelegramMessage,
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

  constructor(
    private readonly service: TrackingService = trackingService,
    private readonly users: UserRepository = userRepository,
    private readonly settings: SettingService = settingService,
  ) {}

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
      return;
    }

    const message = update.message;

    if (!message) {
      return;
    }

    await this.recordTelegramUserFromMessage(message);

    if (!message.text) {
      return;
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const command = text.split(/\s+/)[0].split('@')[0];

    if (command === '/start') {
      await this.sendStartMessage(chatId);
      return;
    }

    if (command === '/help') {
      await this.sendMessage(chatId, telegramMessageBuilder.help());
      return;
    }

    if (command === '/carriers' || command === '/carrier') {
      await this.sendMessage(chatId, telegramMessageBuilder.supportedCarriers());
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
      const adminContact = await this.settings.getAdminContact();
      await this.sendMessage(chatId, telegramMessageBuilder.contact(adminContact));
      return;
    }

    if (command === '/remove') {
      await this.handleRemove(chatId, text);
      return;
    }

    if (trackingNumberSchema.safeParse(text).success) {
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
      await this.postTelegramMessage(chatId, text, options);
    } catch (error) {
      logger.error({ err: error, chatId }, 'Failed to send Telegram message');
    }
  }

  async sendMessageOrThrow(
    chatId: string,
    text: string,
    options: SendMessageOptions = {},
  ): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is empty');
    }

    await this.postTelegramMessage(chatId, text, options);
  }

  private async postTelegramMessage(
    chatId: string,
    text: string,
    options: SendMessageOptions,
  ): Promise<void> {
    await axios.post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: options.replyMarkup,
    });
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
        const safeErrorLog = this.toSafeTelegramErrorLog(error);

        if (this.isTelegramPollingConflict(error)) {
          logger.error(
            safeErrorLog,
            'Telegram polling stopped because another getUpdates instance is already running',
          );
          this.isPolling = false;
          return;
        }

        logger.error(safeErrorLog, 'Telegram polling failed');
        await this.sleep(3000);
      }
    }
  }

  private toSafeTelegramErrorLog(error: unknown): Record<string, unknown> {
    if (error instanceof AxiosError) {
      const responseData = error.response?.data as
        | { description?: string; error_code?: number }
        | undefined;

      return {
        err: {
          name: error.name,
          message: error.message,
          code: error.code,
          status: error.response?.status,
          telegramErrorCode: responseData?.error_code,
          telegramDescription: responseData?.description,
        },
      };
    }

    return { err: error };
  }

  private isTelegramPollingConflict(error: unknown): boolean {
    return error instanceof AxiosError && error.response?.status === 409;
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
    callbackQuery: TelegramCallbackQuery,
  ): Promise<void> {
    const chatId = callbackQuery.message?.chat.id ? String(callbackQuery.message.chat.id) : undefined;

    await this.recordTelegramUserFromCallback(callbackQuery);
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

  private async recordTelegramUserFromMessage(message: TelegramMessage): Promise<void> {
    const user = message.from;
    const telegramId = user?.id ?? message.chat.id;

    try {
      await this.users.upsertUser({
        telegramUserId: String(telegramId),
        username: user?.username ?? message.chat.username ?? null,
        firstName: user?.first_name ?? message.chat.first_name ?? null,
        lastName: user?.last_name ?? message.chat.last_name ?? null,
      });
    } catch (error) {
      logger.warn({ err: error, telegramId: String(telegramId) }, 'Failed to record Telegram user');
    }
  }

  private async recordTelegramUserFromCallback(callbackQuery: TelegramCallbackQuery): Promise<void> {
    const chat = callbackQuery.message?.chat;
    const user = callbackQuery.from;

    try {
      await this.users.upsertUser({
        telegramUserId: String(user.id),
        username: user.username ?? chat?.username ?? null,
        firstName: user.first_name ?? chat?.first_name ?? null,
        lastName: user.last_name ?? chat?.last_name ?? null,
      });
    } catch (error) {
      logger.warn({ err: error, telegramId: String(user.id) }, 'Failed to record Telegram user');
    }
  }

  private async handleAdd(chatId: string, text: string): Promise<void> {
    if (await this.settings.isMaintenanceEnabled()) {
      await this.sendMessage(chatId, telegramMessageBuilder.maintenance());
      return;
    }

    const addMatch = text.match(/^\/add(?:@\w+)?(?:\s+(\S+))?(?:\s+([\s\S]+))?$/i);
    const rawTrackingNumber = addMatch?.[1];
    const note = addMatch?.[2]?.trim();

    if (!rawTrackingNumber) {
      await this.sendMessage(chatId, telegramMessageBuilder.addInstruction());
      return;
    }

    if (note && note.length > MAX_ORDER_NOTE_LENGTH) {
      await this.sendMessage(chatId, telegramMessageBuilder.noteTooLong(MAX_ORDER_NOTE_LENGTH));
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
        const result = await this.service.addOrder(parsed.data, chatId, note);
        await trackingOrderActionLogService.safeCreateLog({
          carrier: result.order.carrier,
          action: TrackingOrderActionType.ADD,
          source: TrackingOrderActionSource.TELEGRAM,
          trackingNumber: result.order.trackingNumber,
          telegramChatId: chatId,
          userId: result.order.userId,
          orderId: result.order.id,
          metadata: {
            carrier: result.order.carrier,
            alreadyExists: true,
            note: note ?? null,
            noteUpdated: result.noteUpdated,
          },
        });
        await this.sendMessage(chatId, telegramMessageBuilder.alreadyExists(result));
        return;
      }

      await this.sendMessage(chatId, telegramMessageBuilder.checking(parsed.data));
      const result = await this.service.addOrder(parsed.data, chatId, note);
      await trackingOrderActionLogService.safeCreateLog({
        carrier: result.order.carrier,
        action: TrackingOrderActionType.ADD,
        source: TrackingOrderActionSource.TELEGRAM,
        trackingNumber: result.order.trackingNumber,
        telegramChatId: chatId,
        userId: result.order.userId,
        orderId: result.order.id,
        metadata: {
          carrier: result.order.carrier,
          alreadyExists: false,
          note: note ?? null,
        },
      });
      await this.sendMessage(chatId, telegramMessageBuilder.addSuccess(result));

      if (result.order.finalStatus !== FinalStatus.PENDING) {
        await this.sendTrackingNotification({
          carrier: result.order.carrier,
          chatId,
          trackingNumber: result.order.trackingNumber,
          status: result.order.currentStatus,
          trackingCode: result.latestRecord.trackingCode,
          location: result.latestRecord.location,
          nextLocation: result.latestRecord.nextLocation,
          milestoneName: result.latestRecord.milestoneName,
          eventTime: result.order.lastEventTime,
          finalStatus: result.order.finalStatus,
          note: result.order.note ?? undefined,
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
      const deletedOrder = await this.service.removeOrder(parsed.data, chatId);
      await trackingOrderActionLogService.safeCreateLog({
        carrier: deletedOrder.carrier,
        action: TrackingOrderActionType.REMOVE,
        source: TrackingOrderActionSource.TELEGRAM,
        trackingNumber: deletedOrder.trackingNumber,
        telegramChatId: chatId,
        userId: deletedOrder.userId,
        metadata: {
          carrier: deletedOrder.carrier,
          deletedOrderId: deletedOrder.id,
        },
      });
      await this.sendMessage(
        chatId,
        telegramMessageBuilder.removeSuccess(parsed.data, deletedOrder.carrier),
      );
    } catch (error) {
      logger.error({ err: error, chatId, rawTrackingNumber }, 'Failed to remove Telegram tracking order');
      await this.sendMessage(chatId, telegramMessageBuilder.invalidTrackingNumber());
    }
  }

  private async sendOrderList(chatId: string, options: SendMessageOptions = {}): Promise<void> {
    const orders = await this.service.listOrders({
      telegramChatId: chatId,
      includeCompleted: false,
    });

    await this.sendMessage(
      chatId,
      orders.length > 0 ? telegramMessageBuilder.list(orders) : telegramMessageBuilder.emptyList(),
      options,
    );
  }
}

export const telegramService = new TelegramService();
