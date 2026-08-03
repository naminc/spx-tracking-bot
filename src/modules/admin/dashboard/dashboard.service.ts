import { FinalStatus } from '../../tracking/final-status';
import { settingService, type SettingService } from '../setting/setting.service';
import {
  DashboardRepository,
  dashboardRepository,
  type DashboardRecentHistoryEntity,
  type DashboardRecentOrderEntity,
} from './dashboard.repository';

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

const emptyStatusCounts = (): Record<FinalStatus, number> => ({
  [FinalStatus.PENDING]: 0,
  [FinalStatus.DELIVERED]: 0,
  [FinalStatus.FAILED]: 0,
  [FinalStatus.CANCELLED]: 0,
});

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
}

export const dashboardService = new DashboardService();
