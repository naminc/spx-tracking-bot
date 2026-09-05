import type { Request, Response } from 'express';
import { successResponse } from '../../../shared/response/api-response';
import { DashboardService, dashboardService } from './dashboard.service';
import type { DashboardAnalyticsQuery } from './dashboard-analytics.schema';

export class DashboardController {
  constructor(private readonly service: DashboardService = dashboardService) {}

  getDashboard = async (_request: Request, response: Response): Promise<void> => {
    const dashboard = await this.service.getDashboard();
    response.json(successResponse('Fetched dashboard successfully', dashboard));
  };

  getAnalytics = async (request: Request, response: Response): Promise<void> => {
    const analytics = await this.service.getAnalytics(
      request.query as unknown as DashboardAnalyticsQuery,
    );
    response.json(successResponse('Fetched dashboard analytics successfully', analytics));
  };
}

export const dashboardController = new DashboardController();
