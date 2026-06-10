import type { Request, Response } from 'express';
import { successResponse } from '../../shared/response/api-response';
import { TelegramService, telegramService } from './telegram.service';
import type { TelegramUpdate } from './telegram.types';

export class TelegramController {
  constructor(private readonly service: TelegramService = telegramService) {}

  webhook = async (request: Request, response: Response): Promise<void> => {
    await this.service.handleUpdate(request.body as TelegramUpdate);
    response.json(successResponse('Telegram webhook processed'));
  };
}

export const telegramController = new TelegramController();
