import { app } from './app';
import { env } from './config/env';
import { startTrackingScheduler } from './modules/tracking/tracking.scheduler';
import { telegramService } from './modules/telegram/telegram.service';
import { logger } from './shared/logger/logger';
import { prisma } from './shared/prisma/client';

const server = app.listen(env.PORT, async () => {
  logger.info({ port: env.PORT }, 'SPX tracking API started');
  await telegramService.startPolling();
  startTrackingScheduler(telegramService);
});

const shutdown = async (): Promise<void> => {
  logger.info('Shutting down SPX tracking API');
  telegramService.stopPolling();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
