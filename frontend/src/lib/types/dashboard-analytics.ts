import type { TrackingCarrier } from "./tracking";

export type DashboardAnalyticsTotals = {
  telegramAdds: number;
  adminAdds: number;
  delivered: number;
  failed: number;
  cancelled: number;
  pending: number;
};

export type DashboardAnalyticsDailyRow = DashboardAnalyticsTotals & {
  date: string;
};

export type DashboardAnalyticsCarrierRow = DashboardAnalyticsTotals & {
  carrier: TrackingCarrier;
};

export type DashboardAnalytics = {
  range: {
    from: string;
    to: string;
    timezone: "Asia/Ho_Chi_Minh";
  };
  totals: DashboardAnalyticsTotals;
  daily: DashboardAnalyticsDailyRow[];
  byCarrier: DashboardAnalyticsCarrierRow[];
};

export type DashboardAnalyticsFilters = {
  from?: string;
  to?: string;
  carrier?: TrackingCarrier | "";
  enabled?: boolean;
};
