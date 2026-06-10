import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger/logger';
import { errorResponse } from '../response/api-response';
import { AppError } from './app-error';

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json(errorResponse('Dữ liệu không hợp lệ', error.issues));
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json(errorResponse(error.message, error.details ?? null));
    return;
  }

  logger.error({ err: error }, 'Unhandled error');
  response.status(500).json(errorResponse('Có lỗi xảy ra', null));
};
