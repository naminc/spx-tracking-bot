import {
  TrackingOrderActionSource,
  TrackingOrderActionType,
  type Prisma,
} from '@prisma/client';
import { logger } from '../../shared/logger/logger';
import {
  CreateTrackingOrderActionLogInput,
  FindTrackingOrderActionLogsFilters,
  TrackingOrderActionLogRepository,
  trackingOrderActionLogRepository,
} from './tracking-action-log.repository';

export type TrackOrderActionLogInput = Omit<
  CreateTrackingOrderActionLogInput,
  'action' | 'source'
> & {
  action: TrackingOrderActionType;
  source: TrackingOrderActionSource;
  metadata?: Prisma.InputJsonValue;
};

export class TrackingOrderActionLogService {
  constructor(
    private readonly repository: TrackingOrderActionLogRepository =
      trackingOrderActionLogRepository,
  ) {}

  listLogs(filters: FindTrackingOrderActionLogsFilters = {}) {
    return this.repository.listLogs(filters);
  }

  createLog(input: TrackOrderActionLogInput) {
    return this.repository.createLog(input);
  }

  async safeCreateLog(input: TrackOrderActionLogInput): Promise<void> {
    try {
      await this.createLog(input);
    } catch (error) {
      logger.error(
        {
          err: error,
          action: input.action,
          source: input.source,
          trackingNumber: input.trackingNumber,
          telegramChatId: input.telegramChatId,
        },
        'Failed to create tracking order action log',
      );
    }
  }
}

export const trackingOrderActionLogService = new TrackingOrderActionLogService();
export { TrackingOrderActionSource, TrackingOrderActionType };
