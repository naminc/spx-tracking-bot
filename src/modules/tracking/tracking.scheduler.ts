import cron from 'node-cron';
import { env } from '../../config/env';
import { logger } from '../../shared/logger/logger';
import { TelegramService } from '../telegram/telegram.service';
import { TrackingService, trackingService } from './tracking.service';

export const startTrackingScheduler = (
  telegramService: TelegramService,
  service: TrackingService = trackingService,
): void => {
  const interval = env.SPX_CHECK_INTERVAL_MINUTES;
  const cronExpression = `*/${interval} * * * *`;

  cron.schedule(cronExpression, async () => {
    logger.info({ cronExpression }, 'Checking active SPX tracking orders');
    const notifications = await service.checkActiveOrders();

    for (const notification of notifications) {
      await telegramService.sendTrackingNotification(notification);
    }
  });

  logger.info({ cronExpression }, 'SPX tracking scheduler started');
};
