import { Router } from 'express';
import { asyncHandler } from '../../shared/errors/async-handler';
import { writeRateLimiter } from '../../shared/http/rate-limit';
import { validateRequest } from '../../shared/validation/validate-request';
import { trackingController } from './tracking.controller';
import {
  createTrackingOrderSchema,
  listHistoriesQuerySchema,
  listOrdersQuerySchema,
  removeOrderQuerySchema,
  trackingCarrierQuerySchema,
  trackingNumberParamsSchema,
} from './tracking.schema';

export const trackingRouter = Router();

trackingRouter.get(
  '/',
  validateRequest({ query: listOrdersQuerySchema }),
  asyncHandler(trackingController.listOrders),
);

trackingRouter.get(
  '/histories',
  validateRequest({ query: listHistoriesQuerySchema }),
  asyncHandler(trackingController.listHistories),
);

trackingRouter.get(
  '/:trackingNumber',
  validateRequest({ params: trackingNumberParamsSchema, query: trackingCarrierQuerySchema }),
  asyncHandler(trackingController.getOrder),
);

trackingRouter.post(
  '/',
  writeRateLimiter,
  validateRequest({ body: createTrackingOrderSchema }),
  asyncHandler(trackingController.createOrder),
);

trackingRouter.delete(
  '/:trackingNumber',
  writeRateLimiter,
  validateRequest({ params: trackingNumberParamsSchema, query: removeOrderQuerySchema }),
  asyncHandler(trackingController.deleteOrder),
);

trackingRouter.get(
  '/:trackingNumber/histories',
  validateRequest({ params: trackingNumberParamsSchema, query: trackingCarrierQuerySchema }),
  asyncHandler(trackingController.getHistories),
);
