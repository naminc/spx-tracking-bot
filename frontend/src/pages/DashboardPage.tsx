import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "../hooks/useDashboard";
import { formatVnd, formatDate } from "../lib/format";
import type { DailyData, TopProduct, LowStockProduct, Order, Deposit, AdminLog } from "../lib/types";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ErrorState } from "../components/ui/ErrorState";

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
] as const;

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return <div className="h-4 rounded bg-indigo-500/20 overflow-hidden"><div className="h-full bg-indigo-500 rounded" style={{ width: `${pct}%` }} /></div>;
}

export function DashboardPage() {
  const [range, setRange] = useState("today");
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useDashboard(range);

  if (isLoading) return null;
  if (error || !data) return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;

  const { stats: s, daily, topProducts, lowStock, recentOrders, recentDeposits, recentAdminLogs } = data;
  const maxRevenue = Math.max(...daily.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {RANGES.map((r) => (
            <button key={r.value} onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${range === r.value ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card title="Revenue" value={formatVnd(s.revenue)} />
        <Card title="Net Revenue" value={formatVnd(s.netRevenue)} />
        <Card title="Orders" value={s.paidOrderCount.toLocaleString()} />
        <Card title="Refunds" value={s.refundedOrderCount.toLocaleString()} />
        <Card title="Deposits (Paid)" value={formatVnd(s.depositAmount)} />
        <Card title="Pending Deposits" value={s.pendingDepositCount.toLocaleString()} />
        <Card title="Available Stock" value={s.availableStock.toLocaleString()} />
        <Card title="New Users" value={s.newUsers.toLocaleString()} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => navigate("/products")}>Products</Button>
        <Button size="sm" variant="secondary" onClick={() => navigate("/stocks")}>Import Stock</Button>
        <Button size="sm" variant="secondary" onClick={() => navigate("/deposits")}>Pending Deposits</Button>
        <Button size="sm" variant="secondary" onClick={() => navigate("/broadcast")}>Broadcast</Button>
      </div>

      {/* Daily Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Daily Revenue</h2>
          </div>
          <div className="overflow-x-auto">
            {daily.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {daily.map((d: DailyData) => (
                    <tr key={d.date}>
                      <td className="px-4 py-2 text-sm text-gray-600">{d.date}</td>
                      <td className="px-4 py-2 text-sm">{d.orders}</td>
                      <td className="px-4 py-2 text-sm">{formatVnd(d.revenue)}</td>
                      <td className="px-4 py-2"><MiniBar value={d.revenue} max={maxRevenue} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No data for this period</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Top Products</h2>
          </div>
          <div className="overflow-x-auto">
            {topProducts.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topProducts.map((p: TopProduct) => (
                    <tr key={p.productId} className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/stocks?productId=${p.productId}`)}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{p.productName}</td>
                      <td className="px-4 py-2 text-sm">{p.orderCount}</td>
                      <td className="px-4 py-2 text-sm">{formatVnd(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No sales in this period</p>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock */}
      {lowStock.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Low Stock Alert ({lowStock.length})</h2>
            <Button size="sm" variant="secondary" onClick={() => navigate("/stocks")}>View All</Button>
          </div>
          <div className="divide-y divide-gray-200">
            {lowStock.map((p: LowStockProduct) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/stocks?productId=${p.id}`)}>
                <span className="text-sm font-medium text-gray-900">{p.name}</span>
                <span className={`text-sm font-semibold ${p.stockCount === 0 ? "text-red-600" : "text-amber-600"}`}>
                  {p.stockCount} items
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <button onClick={() => navigate("/orders")} className="text-xs text-indigo-600 hover:text-indigo-800">View all</button>
          </div>
          <div className="divide-y divide-gray-200">
            {recentOrders.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No orders yet</p>
            ) : recentOrders.map((o: Order) => (
              <div key={o.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{o.productName}</p>
                  <p className="text-xs text-gray-500">{o.user?.username || o.orderCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatVnd(o.price)}</p>
                  <Badge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Deposits */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Deposits</h2>
            <button onClick={() => navigate("/deposits")} className="text-xs text-indigo-600 hover:text-indigo-800">View all</button>
          </div>
          <div className="divide-y divide-gray-200">
            {recentDeposits.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No deposits yet</p>
            ) : recentDeposits.map((d: Deposit) => (
              <div key={d.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.code}</p>
                  <p className="text-xs text-gray-500">{d.user?.username || d.telegramId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatVnd(d.amount)}</p>
                  <Badge status={d.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Admin Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Admin Logs</h2>
            <button onClick={() => navigate("/logs")} className="text-xs text-indigo-600 hover:text-indigo-800">View all</button>
          </div>
          <div className="divide-y divide-gray-200">
            {recentAdminLogs.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No logs yet</p>
            ) : recentAdminLogs.map((l: AdminLog) => (
              <div key={l.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{l.action}</span>
                  <span className="text-xs text-gray-400">{formatDate(l.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{l.admin?.username || l.admin?.firstName || "Admin"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pb-4">
        <span>Total: {s.totalUsers} users, {s.totalProducts} products ({s.activeProducts} active)</span>
        <span>{data.range.label}</span>
      </div>
    </div>
  );
}
