import { Router } from 'express';
import { asyncHandler } from '../../../shared/errors/async-handler';
import { dashboardController } from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get('/', asyncHandler(dashboardController.getDashboard));
