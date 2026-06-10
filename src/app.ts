import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { telegramRouter } from './modules/telegram/telegram.route';
import { trackingRouter } from './modules/tracking/tracking.route';
import { errorMiddleware } from './shared/errors/error.middleware';
import { apiRateLimiter } from './shared/http/rate-limit';
import { logger } from './shared/logger/logger';
import { successResponse } from './shared/response/api-response';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));
app.use(apiRateLimiter);

app.get('/health', (_request, response) => {
  response.json(successResponse('Service is healthy'));
});

app.use('/api/orders', trackingRouter);
app.use('/telegram', telegramRouter);

app.use(errorMiddleware);
