import { Router } from 'express';
import { asyncHandler } from '../../shared/errors/async-handler';
import { validateRequest } from '../../shared/validation/validate-request';
import { trackingOrderActionLogController } from './tracking-action-log.controller';
import { listTrackingOrderActionLogsQuerySchema } from './tracking-action-log.schema';

export const trackingOrderActionLogRouter = Router();

trackingOrderActionLogRouter.get(
  '/',
  validateRequest({ query: listTrackingOrderActionLogsQuerySchema }),
  asyncHandler(trackingOrderActionLogController.listLogs),
);
