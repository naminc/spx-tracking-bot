import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import type { TrackingHistory, TrackingOrder } from "../lib/types/tracking";
import { formatDate } from "../lib/format";
import { useDashboard } from "../hooks/useDashboard";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PaginatedTable } from "../components/ui/PaginatedTable";

const DashboardAnalyticsSection = lazy(() =>
  import("../components/dashboard/DashboardAnalyticsSection").then((module) => ({
    default: module.DashboardAnalyticsSection,
  })),
);

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const dashboardQuery = useDashboard();
  const dashboard = dashboardQuery.data;
  const orders = dashboard?.recentOrders ?? [];
  const histories = dashboard?.recentHistories ?? [];
  const statusCounts = dashboard?.statusCounts;

  const recentOrderColumns = [
    {
      key: "trackingNumber",
      header: "Tracking Number",
      render: (order: TrackingOrder) => <span className="font-mono text-xs">{order.trackingNumber}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (order: TrackingOrder) => order.currentStatus,
      className: "whitespace-normal min-w-80",
    },
    {
      key: "finalStatus",
      header: "Final",
      render: (order: TrackingOrder) => <Badge status={order.finalStatus} />,
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (order: TrackingOrder) => formatDate(order.updatedAt),
    },
  ];

  const historyColumns = [
    {
      key: "trackingNumber",
      header: "Tracking Number",
      render: (history: TrackingHistory) => (
        <span className="font-mono text-xs">{history.order?.trackingNumber ?? "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (history: TrackingHistory) => history.status,
      className: "whitespace-normal min-w-80",
    },
    {
      key: "eventTime",
      header: "Event Time",
      render: (history: TrackingHistory) => formatDate(history.eventTime),
    },
  ];

  if (dashboardQuery.isLoading) return null;
  if (dashboardQuery.error) {
    return (
      <ErrorState
        message={(dashboardQuery.error as Error).message}
        onRetry={() => dashboardQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          <Link className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" to="/orders">
            Orders
          </Link>
          <Link className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" to="/tracking-history">
            Tracking History
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Orders" value={dashboard?.stats.orders.total ?? 0} />
        <StatCard label="Active Orders" value={dashboard?.stats.orders.active ?? 0} />
        <StatCard label="Completed Orders" value={dashboard?.stats.orders.completed ?? 0} />
        <StatCard label="Tracking Events" value={dashboard?.stats.trackingEvents ?? 0} />
        <StatCard label="Telegram Users" value={dashboard?.stats.telegramUsers ?? 0} />
        <StatCard label="Maintenance" value={dashboard?.stats.maintenanceEnabled ? "On" : "Off"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["PENDING", "DELIVERED", "FAILED", "CANCELLED"] as const).map((status) => (
          <div key={status} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <Badge status={status} />
              <span className="text-xl font-semibold text-gray-900">{statusCounts?.[status] ?? 0}</span>
            </div>
          </div>
        ))}
      </div>

      <Suspense
        fallback={
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">
            Loading analytics...
          </div>
        }
      >
        <DashboardAnalyticsSection />
      </Suspense>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link className="text-sm font-medium text-indigo-600 hover:text-indigo-800" to="/orders">
            View all
          </Link>
        </div>
        {orders.length > 0 ? (
          <PaginatedTable
            columns={recentOrderColumns}
            data={orders}
            keyExtractor={(order) => String(order.id)}
            initialPageSize={8}
            pageSizeOptions={[8, 16, 32]}
          />
        ) : (
          <EmptyState message="No orders found" />
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-gray-900">Recent Tracking History</h2>
          <Link className="text-sm font-medium text-indigo-600 hover:text-indigo-800" to="/tracking-history">
            View all
          </Link>
        </div>
        {histories.length > 0 ? (
          <PaginatedTable
            columns={historyColumns}
            data={histories}
            keyExtractor={(history) => String(history.id)}
            initialPageSize={8}
            pageSizeOptions={[8, 16, 32]}
          />
        ) : (
          <EmptyState message="No tracking history found" />
        )}
      </section>
    </div>
  );
}
