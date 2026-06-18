import { Router } from 'express';
import { asyncHandler } from '../../../shared/errors/async-handler';
import { writeRateLimiter } from '../../../shared/http/rate-limit';
import { validateRequest } from '../../../shared/validation/validate-request';
import { broadcastController } from './broadcast.controller';
import {
  broadcastIdParamsSchema,
  createBroadcastSchema,
} from './broadcast.schema';

export const broadcastRouter = Router();

broadcastRouter.get('/', asyncHandler(broadcastController.listBroadcasts));

broadcastRouter.get(
  '/:id',
  validateRequest({ params: broadcastIdParamsSchema }),
  asyncHandler(broadcastController.getBroadcast),
);

broadcastRouter.post(
  '/',
  writeRateLimiter,
  validateRequest({ body: createBroadcastSchema }),
  asyncHandler(broadcastController.createBroadcast),
);

broadcastRouter.post(
  '/:id/send',
  writeRateLimiter,
  validateRequest({ params: broadcastIdParamsSchema }),
  asyncHandler(broadcastController.sendBroadcast),
);
