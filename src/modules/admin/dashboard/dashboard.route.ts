import { Router } from 'express';
import { asyncHandler } from '../../../shared/errors/async-handler';
import { validateRequest } from '../../../shared/validation/validate-request';
import { dashboardAnalyticsQuerySchema } from './dashboard-analytics.schema';
import { dashboardController } from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/analytics',
  validateRequest({ query: dashboardAnalyticsQuerySchema }),
  asyncHandler(dashboardController.getAnalytics),
);
dashboardRouter.get('/', asyncHandler(dashboardController.getDashboard));
