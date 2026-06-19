import type { Request, Response } from 'express';
import { successResponse } from '../../shared/response/api-response';
import {
  TrackingOrderActionLogService,
  trackingOrderActionLogService,
} from './tracking-action-log.service';
import type { ListTrackingOrderActionLogsQuery } from './tracking-action-log.schema';

export class TrackingOrderActionLogController {
  constructor(
    private readonly service: TrackingOrderActionLogService =
      trackingOrderActionLogService,
  ) {}

  listLogs = async (request: Request, response: Response): Promise<void> => {
    const logs = await this.service.listLogs(
      request.query as unknown as ListTrackingOrderActionLogsQuery,
    );
    response.json(successResponse('Lấy lịch sử thao tác đơn hàng thành công', logs));
  };
}

export const trackingOrderActionLogController = new TrackingOrderActionLogController();
