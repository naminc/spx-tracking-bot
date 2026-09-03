import type { Request, Response } from 'express';
import { getPaginationMeta } from '../../shared/pagination/pagination';
import { paginatedResponse } from '../../shared/response/api-response';
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
    const result = await this.service.listLogs(
      request.query as unknown as ListTrackingOrderActionLogsQuery,
    );

    response.json(
      paginatedResponse(
        'Fetched tracking action logs successfully',
        result.data,
        getPaginationMeta(result),
      ),
    );
  };
}

export const trackingOrderActionLogController = new TrackingOrderActionLogController();
