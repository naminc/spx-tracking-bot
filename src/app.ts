import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { requireAdminAuth } from './modules/admin/auth/auth.middleware';
import { authRouter } from './modules/admin/auth/auth.route';
import { broadcastRouter } from './modules/admin/broadcast/broadcast.route';
import { settingRouter } from './modules/admin/setting/setting.route';
import { userRouter } from './modules/admin/user/user.route';
import { telegramRouter } from './modules/telegram/telegram.route';
import { trackingRouter } from './modules/tracking/tracking.route';
import { trackingOrderActionLogRouter } from './modules/tracking-action-log/tracking-action-log.route';
import { errorMiddleware } from './shared/errors/error.middleware';
import { apiRateLimiter } from './shared/http/rate-limit';
import { logger } from './shared/logger/logger';
import { successResponse } from './shared/response/api-response';

export const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));
app.use(apiRateLimiter);

app.get('/health', (_request, response) => {
  response.json(successResponse('Service is healthy'));
});

app.use('/api/admin/auth', authRouter);
app.use('/api/admin/settings', requireAdminAuth, settingRouter);
app.use('/api/orders', requireAdminAuth, trackingRouter);
app.use('/api/admin/users', requireAdminAuth, userRouter);
app.use('/api/admin/broadcasts', requireAdminAuth, broadcastRouter);
app.use('/api/admin/tracking-action-logs', requireAdminAuth, trackingOrderActionLogRouter);
app.use('/telegram', telegramRouter);

app.use(errorMiddleware);
