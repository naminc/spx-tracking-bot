import { useState } from "react";
import { toast } from "sonner";
import type { AdminLog } from "../lib/types";
import { formatDate } from "../lib/format";
import { useLogs, useExportLogs } from "../hooks/useLogs";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { Table } from "../components/ui/Table";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";

const ACTION_COLORS: Record<string, string> = {
  PRODUCT_CREATED: "bg-blue-100 text-blue-800",
  PRODUCT_UPDATED: "bg-blue-100 text-blue-800",
  PRODUCT_DELETED: "bg-red-100 text-red-800",
  STOCK_IMPORTED: "bg-blue-100 text-blue-800",
  STOCK_ITEM_DELETED: "bg-red-100 text-red-800",
  STOCK_AVAILABLE_CLEARED: "bg-red-100 text-red-800",
  STOCK_RECOUNTED: "bg-blue-100 text-blue-800",
  STOCK_RECOUNT_ALL: "bg-blue-100 text-blue-800",
  STOCK_EXPORTED: "bg-blue-100 text-blue-800",
  ORDER_REFUNDED: "bg-amber-100 text-amber-800",
  DEPOSIT_CONFIRMED: "bg-green-100 text-green-800",
  DEPOSIT_CANCELLED: "bg-red-100 text-red-800",
  USER_BALANCE_ADDED: "bg-green-100 text-green-800",
  USER_BALANCE_SUBTRACTED: "bg-amber-100 text-amber-800",
  USER_BLOCKED: "bg-red-100 text-red-800",
  USER_UNBLOCKED: "bg-green-100 text-green-800",
  SETTINGS_UPDATED: "bg-blue-100 text-blue-800",
  BROADCAST_CREATED: "bg-blue-100 text-blue-800",
  WEB_ADMIN_LOGIN: "bg-gray-100 text-gray-600",
  WEB_ADMIN_LOGOUT: "bg-gray-100 text-gray-600",
  ADMIN_LOGS_EXPORTED: "bg-gray-100 text-gray-600"
};

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-block text-xs font-mono px-1.5 py-0.5 rounded ${color}`}
    >
      {action}
    </span>
  );
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function LogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [targetId, setTargetId] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [detail, setDetail] = useState<AdminLog | null>(null);

  const { data, isLoading, error, refetch } = useLogs({
    page,
    action: action || undefined,
    targetId: targetId || undefined,
    q: search || undefined,
    from: fromDate || undefined,
    to: toDate || undefined
  });
  const exportMut = useExportLogs();

  const actionOptions = [
    { value: "", label: "All Actions" },
    ...(data?.actions ?? []).map((a) => ({ value: a, label: a }))
  ];

  const handleExport = () => {
    exportMut.mutate(
      {
        action: action || undefined,
        targetId: targetId || undefined,
        from: fromDate || undefined,
        to: toDate || undefined
      },
      {
        onSuccess: (d) => {
          downloadText(d.filename, d.content);
          toast.success(`Exported ${d.count} logs`);
        }
      }
    );
  };

  const handleCopyDetail = (log: AdminLog) => {
    navigator.clipboard.writeText(JSON.stringify(log.detail, null, 2));
    toast.success("Detail copied");
  };

  const columns = [
    {
      key: "date",
      header: "Time",
      render: (l: AdminLog) => (
        <span className="text-gray-500 text-xs whitespace-nowrap">
          {formatDate(l.createdAt)}
        </span>
      )
    },
    {
      key: "action",
      header: "Action",
      render: (l: AdminLog) => <ActionBadge action={l.action} />
    },
    {
      key: "admin",
      header: "Admin",
      render: (l: AdminLog) => (
        <span className="text-sm">
          {l.admin?.username || l.admin?.firstName || l.adminId.slice(0, 8)}
        </span>
      )
    },
    {
      key: "target",
      header: "Target",
      render: (l: AdminLog) =>
        l.targetId ? (
          <span className="font-mono text-xs" title={l.targetId}>
            {l.targetId.slice(0, 12)}...
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )
    },
    {
      key: "summary",
      header: "Summary",
      render: (l: AdminLog) => {
        if (!l.detail) return <span className="text-gray-400">—</span>;
        const str = JSON.stringify(l.detail);
        return (
          <span
            className="text-xs text-gray-500 truncate block max-w-xs"
            title={str}
          >
            {str.slice(0, 80)}
            {str.length > 80 ? "..." : ""}
          </span>
        );
      }
    }
  ];

  if (isLoading) return null;
  if (error)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Admin Logs</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExport}
            loading={exportMut.isPending}
          >
            Export
          </Button>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Select
          options={actionOptions}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        />
        <Input
          placeholder="Target ID..."
          value={targetId}
          onChange={(e) => {
            setTargetId(e.target.value);
            setPage(1);
          }}
        />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {data && data.items.length > 0 ? (
          <>
            <Table
              columns={columns}
              data={data.items}
              keyExtractor={(l) => l.id}
              onRowClick={(l) => setDetail(l)}
            />
            <Pagination
              page={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState message="No logs found" />
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Log Detail"
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Action</dt>
              <dd>
                <ActionBadge action={detail.action} />
              </dd>
              <dt className="text-gray-500">Admin</dt>
              <dd>
                {detail.admin?.username ||
                  detail.admin?.firstName ||
                  detail.adminId}
              </dd>
              <dt className="text-gray-500">Target ID</dt>
              <dd className="font-mono text-xs">{detail.targetId || "—"}</dd>
              <dt className="text-gray-500">Time</dt>
              <dd>{formatDate(detail.createdAt)}</dd>
            </dl>
            {detail.detail != null && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-700">Detail</h4>
                  <button
                    onClick={() => handleCopyDetail(detail)}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto max-h-72 whitespace-pre-wrap break-words">
                  {JSON.stringify(detail.detail, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
