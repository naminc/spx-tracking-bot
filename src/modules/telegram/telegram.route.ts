import { Router } from 'express';
import { asyncHandler } from '../../shared/errors/async-handler';
import { writeRateLimiter } from '../../shared/http/rate-limit';
import { telegramController } from './telegram.controller';

export const telegramRouter = Router();

telegramRouter.post('/webhook', writeRateLimiter, asyncHandler(telegramController.webhook));
