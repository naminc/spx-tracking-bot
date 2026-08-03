import type { Request, Response } from 'express';
import { successResponse } from '../../../shared/response/api-response';
import { DashboardService, dashboardService } from './dashboard.service';

export class DashboardController {
  constructor(private readonly service: DashboardService = dashboardService) {}

  getDashboard = async (_request: Request, response: Response): Promise<void> => {
    const dashboard = await this.service.getDashboard();
    response.json(successResponse('Lấy dashboard thành công', dashboard));
  };
}

export const dashboardController = new DashboardController();
