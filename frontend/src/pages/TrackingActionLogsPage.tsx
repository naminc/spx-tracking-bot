import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserFilterSelect } from "../components/UserFilterSelect";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { PaginatedTable } from "../components/ui/PaginatedTable";
import { useTrackingActionLogs } from "../hooks/useTrackingActionLogs";
import { useUsers } from "../hooks/useUsers";
import { formatDate } from "../lib/format";
import type {
  TrackingOrderActionLog,
  TrackingOrderActionSource,
  TrackingOrderActionType,
} from "../lib/types/tracking-action-log";
import type { User } from "../lib/types/user";

function optionalText(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatUser(user: User | null | undefined) {
  if (!user) return "-";

  const prefix = `#${user.id}`;

  if (user.username) return `${prefix} - @${user.username}`;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (fullName) return `${prefix} - ${fullName} (${user.telegramUserId})`;

  return `${prefix} - ${user.telegramUserId}`;
}

function formatAdmin(log: TrackingOrderActionLog) {
  if (!log.adminTelegramId && !log.adminUsername) return "-";

  return [log.adminUsername ? `@${log.adminUsername}` : null, log.adminTelegramId]
    .filter(Boolean)
    .join(" · ");
}

function formatMetadata(metadata: unknown) {
  if (!metadata || (typeof metadata === "object" && Object.keys(metadata).length === 0)) {
    return "-";
  }

  return JSON.stringify(metadata);
}

export function TrackingActionLogsPage() {
  const [actionInput, setActionInput] = useState<TrackingOrderActionType | "">("");
  const [sourceInput, setSourceInput] = useState<TrackingOrderActionSource | "">("");
  const [trackingInput, setTrackingInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [userInput, setUserInput] = useState("");
  const normalizedTrackingNumber = trackingInput.trim().toUpperCase();
  const normalizedChatId = chatInput.trim();

  const logsQuery = useTrackingActionLogs({
    action: actionInput,
    source: sourceInput,
    trackingNumber: normalizedTrackingNumber || undefined,
    telegramChatId: normalizedChatId || undefined,
    userId: userInput || undefined,
  });
  const usersQuery = useUsers();
  const logs = logsQuery.data ?? [];
  const tableResetKey = [
    actionInput,
    sourceInput,
    normalizedTrackingNumber,
    normalizedChatId,
    userInput,
  ].join("|");

  const columns = [
    {
      key: "createdAt",
      header: "Time",
      render: (log: TrackingOrderActionLog) => formatDate(log.createdAt),
    },
    {
      key: "action",
      header: "Action",
      render: (log: TrackingOrderActionLog) => <Badge status={log.action} />,
    },
    {
      key: "source",
      header: "Source",
      render: (log: TrackingOrderActionLog) => <Badge status={log.source} />,
    },
    {
      key: "trackingNumber",
      header: "Tracking Number",
      render: (log: TrackingOrderActionLog) => (
        <span className="font-mono text-xs">{log.trackingNumber}</span>
      ),
    },
    {
      key: "telegramChatId",
      header: "Telegram Chat ID",
      render: (log: TrackingOrderActionLog) => (
        <span className="font-mono text-xs">{optionalText(log.telegramChatId)}</span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (log: TrackingOrderActionLog) => (
        <span className="text-xs">{formatUser(log.user)}</span>
      ),
      className: "whitespace-normal min-w-48",
    },
    {
      key: "admin",
      header: "Admin",
      render: (log: TrackingOrderActionLog) => formatAdmin(log),
      className: "whitespace-normal min-w-40",
    },
    {
      key: "metadata",
      header: "Metadata",
      render: (log: TrackingOrderActionLog) => (
        <span className="font-mono text-xs">{formatMetadata(log.metadata)}</span>
      ),
      className: "whitespace-normal min-w-72",
    },
  ];

  const handleClear = () => {
    setActionInput("");
    setSourceInput("");
    setTrackingInput("");
    setChatInput("");
    setUserInput("");
  };

  const tableError = logsQuery.error || usersQuery.error;
  const tableErrorMessage = tableError ? (tableError as Error).message : "";

  useEffect(() => {
    if (tableErrorMessage) {
      toast.error(tableErrorMessage, { id: "tracking-action-logs-filter-error" });
    }
  }, [tableErrorMessage]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Action Logs</h1>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[160px_160px_1fr_1fr_1.4fr_auto] md:items-end">
        <div>
          <label htmlFor="action-filter" className="mb-1 block text-sm font-medium text-gray-700">
            Action
          </label>
          <select
            id="action-filter"
            value={actionInput}
            onChange={(event) => setActionInput(event.target.value as TrackingOrderActionType | "")}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All</option>
            <option value="ADD">ADD</option>
            <option value="REMOVE">REMOVE</option>
          </select>
        </div>
        <div>
          <label htmlFor="source-filter" className="mb-1 block text-sm font-medium text-gray-700">
            Source
          </label>
          <select
            id="source-filter"
            value={sourceInput}
            onChange={(event) => setSourceInput(event.target.value as TrackingOrderActionSource | "")}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All</option>
            <option value="TELEGRAM">TELEGRAM</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <Input
          label="Tracking Number"
          value={trackingInput}
          onChange={(event) => setTrackingInput(event.target.value)}
          placeholder="SPXVN063015366786"
        />
        <Input
          label="Telegram Chat ID"
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder="6142403832"
        />
        <UserFilterSelect
          label="User"
          users={usersQuery.data ?? []}
          value={userInput}
          onChange={setUserInput}
          disabled={usersQuery.isLoading}
        />
        <Button type="button" variant="secondary" onClick={handleClear}>
          Clear
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {tableError ? (
          <ErrorState
            message={(tableError as Error).message}
            onRetry={() => {
              logsQuery.refetch();
              usersQuery.refetch();
            }}
          />
        ) : (
          <PaginatedTable
            columns={columns}
            data={logs}
            keyExtractor={(log) => String(log.id)}
            initialPageSize={10}
            resetKey={tableResetKey}
            loading={logsQuery.isLoading || logsQuery.isFetching}
            emptyMessage="No action logs found"
          />
        )}
      </div>
    </div>
  );
}
