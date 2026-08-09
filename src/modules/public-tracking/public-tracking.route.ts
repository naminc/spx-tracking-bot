import { Router } from 'express';
import { asyncHandler } from '../../shared/errors/async-handler';
import { publicTrackingRateLimiter } from '../../shared/http/rate-limit';
import { validateRequest } from '../../shared/validation/validate-request';
import { publicTrackingController } from './public-tracking.controller';
import { publicTrackSchema } from './public-tracking.schema';

export const publicTrackingRouter = Router();

publicTrackingRouter.post(
  '/track',
  publicTrackingRateLimiter,
  validateRequest({ body: publicTrackSchema }),
  asyncHandler(publicTrackingController.track),
);
