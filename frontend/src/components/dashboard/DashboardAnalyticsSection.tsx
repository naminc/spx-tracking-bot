import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboardAnalytics } from "../../hooks/useDashboardAnalytics";
import type { TrackingCarrier } from "../../lib/types/tracking";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";

type RangePreset = "7" | "30" | "90";

const dayInMs = 86_400_000;

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRangeForPreset(preset: RangePreset): { from: string; to: string } {
  const days = Number(preset);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(today.getTime() - (days - 1) * dayInMs);

  return {
    from: formatDateInput(from),
    to: formatDateInput(today),
  };
}

function formatChartDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00+07:00`));
}

export function DashboardAnalyticsSection() {
  const [rangePreset, setRangePreset] = useState<RangePreset>("30");
  const [carrierFilter, setCarrierFilter] = useState<TrackingCarrier | "">("");
  const analyticsRange = useMemo(() => getRangeForPreset(rangePreset), [rangePreset]);
  const analyticsQuery = useDashboardAnalytics({
    ...analyticsRange,
    carrier: carrierFilter,
  });
  const analytics = analyticsQuery.data;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
          <p className="text-sm text-gray-500">
            Daily order adds and final status trends.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            Range
            <select
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={rangePreset}
              onChange={(event) => setRangePreset(event.target.value as RangePreset)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Carrier
            <select
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={carrierFilter}
              onChange={(event) => setCarrierFilter(event.target.value as TrackingCarrier | "")}
            >
              <option value="">All carriers</option>
              <option value="SPX">SPX</option>
              <option value="GHN">GHN</option>
              <option value="JNT">J&amp;T</option>
            </select>
          </label>
        </div>
      </div>

      {analyticsQuery.error ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <ErrorState
            message={(analyticsQuery.error as Error).message}
            onRetry={() => analyticsQuery.refetch()}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Telegram Adds" value={analytics?.totals.telegramAdds ?? 0} />
            <StatCard label="Admin Adds" value={analytics?.totals.adminAdds ?? 0} />
            <StatCard label="Delivered" value={analytics?.totals.delivered ?? 0} />
            <StatCard label="Failed" value={analytics?.totals.failed ?? 0} />
            <StatCard label="Cancelled" value={analytics?.totals.cancelled ?? 0} />
            <StatCard label="Pending" value={analytics?.totals.pending ?? 0} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartPanel title="Orders added">
              {analytics && analytics.daily.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.daily} margin={{ left: -20, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <Tooltip labelFormatter={(value) => formatChartDate(String(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="telegramAdds"
                      name="Telegram Adds"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="adminAdds"
                      name="Admin Adds"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message={analyticsQuery.isFetching ? "Loading analytics..." : "No analytics found"} />
              )}
            </ChartPanel>

            <ChartPanel title="Daily final status">
              {analytics && analytics.daily.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.daily} margin={{ left: -20, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <Tooltip labelFormatter={(value) => formatChartDate(String(value))} />
                    <Legend />
                    <Bar dataKey="delivered" name="Delivered" stackId="status" fill="#16a34a" />
                    <Bar dataKey="failed" name="Failed" stackId="status" fill="#dc2626" />
                    <Bar dataKey="cancelled" name="Cancelled" stackId="status" fill="#f97316" />
                    <Bar dataKey="pending" name="Pending" stackId="status" fill="#eab308" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message={analyticsQuery.isFetching ? "Loading analytics..." : "No analytics found"} />
              )}
            </ChartPanel>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Carrier Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Carrier</th>
                    <th className="px-4 py-3">Telegram Adds</th>
                    <th className="px-4 py-3">Admin Adds</th>
                    <th className="px-4 py-3">Delivered</th>
                    <th className="px-4 py-3">Failed</th>
                    <th className="px-4 py-3">Cancelled</th>
                    <th className="px-4 py-3">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(analytics?.byCarrier ?? []).map((row) => (
                    <tr key={row.carrier}>
                      <td className="px-4 py-3">
                        <Badge status={row.carrier} />
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.telegramAdds}</td>
                      <td className="px-4 py-3 text-gray-700">{row.adminAdds}</td>
                      <td className="px-4 py-3 text-gray-700">{row.delivered}</td>
                      <td className="px-4 py-3 text-gray-700">{row.failed}</td>
                      <td className="px-4 py-3 text-gray-700">{row.cancelled}</td>
                      <td className="px-4 py-3 text-gray-700">{row.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {analyticsQuery.isFetching && (
              <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
                Updating analytics...
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
