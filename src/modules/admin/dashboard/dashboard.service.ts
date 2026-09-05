import { FinalStatus } from '../../tracking/final-status';
import { TrackingCarrier, type TrackingCarrier as TrackingCarrierType } from '../../tracking/tracking-carrier';
import { AppError } from '../../../shared/errors/app-error';
import { settingService, type SettingService } from '../setting/setting.service';
import {
  DashboardRepository,
  dashboardRepository,
  type DashboardActionAnalyticsRow,
  type DashboardOrderStatusAnalyticsRow,
  type DashboardRecentHistoryEntity,
  type DashboardRecentOrderEntity,
} from './dashboard.repository';
import type { DashboardAnalyticsQuery } from './dashboard-analytics.schema';

export type DashboardStatsDto = {
  orders: {
    total: number;
    active: number;
    completed: number;
  };
  trackingEvents: number;
  telegramUsers: number;
  maintenanceEnabled: boolean;
};

export type DashboardDto = {
  stats: DashboardStatsDto;
  statusCounts: Record<FinalStatus, number>;
  recentOrders: DashboardRecentOrderEntity[];
  recentHistories: DashboardRecentHistoryEntity[];
};

export type DailyAnalyticsRow = {
  date: string;
  telegramAdds: number;
  adminAdds: number;
  delivered: number;
  failed: number;
  cancelled: number;
  pending: number;
};

export type CarrierAnalyticsRow = DashboardAnalyticsTotalsDto & {
  carrier: TrackingCarrierType;
};

export type DashboardAnalyticsTotalsDto = Omit<DailyAnalyticsRow, 'date'>;

export type DashboardAnalyticsDto = {
  range: {
    from: string;
    to: string;
    timezone: typeof dashboardAnalyticsTimezone;
  };
  totals: DashboardAnalyticsTotalsDto;
  daily: DailyAnalyticsRow[];
  byCarrier: CarrierAnalyticsRow[];
};

const emptyStatusCounts = (): Record<FinalStatus, number> => ({
  [FinalStatus.PENDING]: 0,
  [FinalStatus.DELIVERED]: 0,
  [FinalStatus.FAILED]: 0,
  [FinalStatus.CANCELLED]: 0,
});

const dashboardAnalyticsTimezone = 'Asia/Ho_Chi_Minh';
const dayInMs = 86_400_000;
const defaultRangeDays = 30;
const maxRangeDays = 180;
const carriers = [TrackingCarrier.SPX, TrackingCarrier.GHN, TrackingCarrier.JNT] as const;

type DateRange = {
  from: string;
  to: string;
  fromUtc: Date;
  toExclusiveUtc: Date;
};

const emptyDailyRow = (date: string): DailyAnalyticsRow => ({
  date,
  telegramAdds: 0,
  adminAdds: 0,
  delivered: 0,
  failed: 0,
  cancelled: 0,
  pending: 0,
});

const emptyCarrierRow = (carrier: TrackingCarrierType): CarrierAnalyticsRow => ({
  carrier,
  telegramAdds: 0,
  adminAdds: 0,
  delivered: 0,
  failed: 0,
  cancelled: 0,
  pending: 0,
});

const formatDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const parseDateOnlyToUtc = (date: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (formatDateOnly(parsed) !== date) {
    throw new AppError('Invalid date', 400);
  }

  return parsed;
};

const addDays = (date: string, days: number): string =>
  formatDateOnly(new Date(parseDateOnlyToUtc(date).getTime() + days * dayInMs));

const getTodayInAnalyticsTimezone = (): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: dashboardAnalyticsTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return formatDateOnly(new Date());
  }

  return `${year}-${month}-${day}`;
};

const toVietnamDayStartUtc = (date: string): Date => new Date(`${date}T00:00:00+07:00`);

const getRange = (query: DashboardAnalyticsQuery): DateRange => {
  const today = getTodayInAnalyticsTimezone();
  const from = query.from ?? addDays(today, -(defaultRangeDays - 1));
  const to = query.to ?? today;

  const fromDate = parseDateOnlyToUtc(from);
  const toDate = parseDateOnlyToUtc(to);
  const rangeDays = Math.floor((toDate.getTime() - fromDate.getTime()) / dayInMs) + 1;

  if (rangeDays <= 0) {
    throw new AppError('From date must be before or equal to to date', 400);
  }

  if (rangeDays > maxRangeDays) {
    throw new AppError(`Date range cannot exceed ${maxRangeDays} days`, 400);
  }

  return {
    from,
    to,
    fromUtc: toVietnamDayStartUtc(from),
    toExclusiveUtc: toVietnamDayStartUtc(addDays(to, 1)),
  };
};

const getDateKeys = (from: string, to: string): string[] => {
  const keys: string[] = [];
  let current = from;

  while (current <= to) {
    keys.push(current);
    current = addDays(current, 1);
  }

  return keys;
};

const normalizeEventDate = (value: string | Date): string =>
  value instanceof Date ? formatDateOnly(value) : value.slice(0, 10);

const normalizeCount = (count: bigint | number): number => Number(count);

const addMetric = (
  target: DailyAnalyticsRow,
  metric: keyof DashboardAnalyticsTotalsDto,
  count: number,
): void => {
  target[metric] += count;
};

const addCarrierMetric = (
  target: CarrierAnalyticsRow,
  metric: keyof DashboardAnalyticsTotalsDto,
  count: number,
): void => {
  target[metric] += count;
};

const statusToMetric = (
  finalStatus: FinalStatus,
): keyof Pick<DashboardAnalyticsTotalsDto, 'delivered' | 'failed' | 'cancelled' | 'pending'> => {
  if (finalStatus === FinalStatus.DELIVERED) {
    return 'delivered';
  }

  if (finalStatus === FinalStatus.FAILED) {
    return 'failed';
  }

  if (finalStatus === FinalStatus.CANCELLED) {
    return 'cancelled';
  }

  return 'pending';
};

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository = dashboardRepository,
    private readonly settings: SettingService = settingService,
  ) {}

  async getDashboard(): Promise<DashboardDto> {
    const [orderCounts, trackingEvents, telegramUsers, settings, recentOrders, recentHistories] =
      await Promise.all([
        this.repository.getOrderCounts(),
        this.repository.getTrackingHistoryCount(),
        this.repository.getUserCount(),
        this.settings.getSettings(),
        this.repository.getRecentOrders(),
        this.repository.getRecentHistories(),
      ]);

    const statusCounts = emptyStatusCounts();
    orderCounts.byFinalStatus.forEach((item) => {
      statusCounts[item.finalStatus] = item._count._all;
    });

    return {
      stats: {
        orders: {
          total: orderCounts.total,
          active: orderCounts.active,
          completed: orderCounts.completed,
        },
        trackingEvents,
        telegramUsers,
        maintenanceEnabled: settings.maintenanceEnabled,
      },
      statusCounts,
      recentOrders,
      recentHistories,
    };
  }

  async getAnalytics(query: DashboardAnalyticsQuery): Promise<DashboardAnalyticsDto> {
    const range = getRange(query);
    const dateKeys = getDateKeys(range.from, range.to);
    const dailyByDate = new Map(dateKeys.map((date) => [date, emptyDailyRow(date)]));
    const carrierRows = carriers
      .filter((carrier) => !query.carrier || carrier === query.carrier)
      .map((carrier) => [carrier, emptyCarrierRow(carrier)] as const);
    const byCarrier = new Map<TrackingCarrierType, CarrierAnalyticsRow>(carrierRows);

    const totals: DashboardAnalyticsTotalsDto = {
      telegramAdds: 0,
      adminAdds: 0,
      delivered: 0,
      failed: 0,
      cancelled: 0,
      pending: 0,
    };

    const [actionAdds, orderStatusCounts] = await Promise.all([
      this.repository.getDailyActionAdds({
        fromUtc: range.fromUtc,
        toExclusiveUtc: range.toExclusiveUtc,
        carrier: query.carrier,
      }),
      this.repository.getDailyOrderStatusCounts({
        fromUtc: range.fromUtc,
        toExclusiveUtc: range.toExclusiveUtc,
        carrier: query.carrier,
      }),
    ]);

    this.applyActionRows(actionAdds, dailyByDate, byCarrier, totals);
    this.applyStatusRows(orderStatusCounts, dailyByDate, byCarrier, totals);

    return {
      range: {
        from: range.from,
        to: range.to,
        timezone: dashboardAnalyticsTimezone,
      },
      totals,
      daily: Array.from(dailyByDate.values()),
      byCarrier: Array.from(byCarrier.values()),
    };
  }

  private applyActionRows(
    rows: DashboardActionAnalyticsRow[],
    dailyByDate: Map<string, DailyAnalyticsRow>,
    byCarrier: Map<TrackingCarrierType, CarrierAnalyticsRow>,
    totals: DashboardAnalyticsTotalsDto,
  ): void {
    rows.forEach((row) => {
      const metric = row.source === 'TELEGRAM' ? 'telegramAdds' : 'adminAdds';
      const count = normalizeCount(row.count);
      const date = normalizeEventDate(row.eventDate);
      const daily = dailyByDate.get(date);
      const carrier = byCarrier.get(row.carrier);

      if (daily) {
        addMetric(daily, metric, count);
      }

      if (carrier) {
        addCarrierMetric(carrier, metric, count);
      }

      totals[metric] += count;
    });
  }

  private applyStatusRows(
    rows: DashboardOrderStatusAnalyticsRow[],
    dailyByDate: Map<string, DailyAnalyticsRow>,
    byCarrier: Map<TrackingCarrierType, CarrierAnalyticsRow>,
    totals: DashboardAnalyticsTotalsDto,
  ): void {
    rows.forEach((row) => {
      const metric = statusToMetric(row.finalStatus);
      const count = normalizeCount(row.count);
      const date = normalizeEventDate(row.eventDate);
      const daily = dailyByDate.get(date);
      const carrier = byCarrier.get(row.carrier);

      if (daily) {
        addMetric(daily, metric, count);
      }

      if (carrier) {
        addCarrierMetric(carrier, metric, count);
      }

      totals[metric] += count;
    });
  }
}

export const dashboardService = new DashboardService();
