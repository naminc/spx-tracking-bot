import type { FinalStatus, TrackingHistory, TrackingOrder } from "./tracking";

export type DashboardStats = {
  orders: {
    total: number;
    active: number;
    completed: number;
  };
  trackingEvents: number;
  telegramUsers: number;
  maintenanceEnabled: boolean;
};

export type Dashboard = {
  stats: DashboardStats;
  statusCounts: Record<FinalStatus, number>;
  recentOrders: TrackingOrder[];
  recentHistories: TrackingHistory[];
};
