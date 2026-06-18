import type { FormEvent } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { TrackingHistory, TrackingUser } from "../lib/types/tracking";
import { formatDate } from "../lib/format";
import { useTrackingHistories } from "../hooks/useTracking";
import { useUsers } from "../hooks/useUsers";
import { UserFilterSelect } from "../components/UserFilterSelect";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PaginatedTable } from "../components/ui/PaginatedTable";

const trackingNumberPattern = /^SPXVN[A-Z0-9]{6,40}$/i;

function optionalText(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatUser(user: TrackingUser | null | undefined) {
  if (!user) return "-";

  const prefix = `#${user.id}`;

  if (user.username) return `${prefix} - @${user.username}`;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (fullName) return `${prefix} - ${fullName} (${user.telegramUserId})`;

  return `${prefix} - ${user.telegramUserId}`;
}

export function TrackingHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTrackingNumber = searchParams.get("trackingNumber")?.trim().toUpperCase() ?? "";
  const initialChatId = searchParams.get("telegramChatId")?.trim() ?? "";
  const initialUserId = searchParams.get("userId")?.trim() ?? "";
  const [trackingInput, setTrackingInput] = useState(initialTrackingNumber);
  const [chatInput, setChatInput] = useState(initialChatId);
  const [userInput, setUserInput] = useState(initialUserId);
  const [filters, setFilters] = useState({
    trackingNumber: initialTrackingNumber,
    telegramChatId: initialChatId,
    userId: initialUserId,
  });
  const [selectedHistory, setSelectedHistory] = useState<TrackingHistory | null>(null);
  const { data = [], isLoading, error, refetch } = useTrackingHistories({
    trackingNumber: filters.trackingNumber || undefined,
    telegramChatId: filters.telegramChatId || undefined,
    userId: filters.userId || undefined,
    limit: 200,
  });
  const usersQuery = useUsers();

  const columns = [
    {
      key: "trackingNumber",
      header: "Tracking Number",
      render: (history: TrackingHistory) => (
        <span className="font-mono text-xs">{history.order?.trackingNumber ?? "-"}</span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (history: TrackingHistory) => (
        <span className="text-xs">
          {formatUser(history.order?.user)}
        </span>
      ),
    },
    {
      key: "chat",
      header: "Chat ID",
      render: (history: TrackingHistory) => (
        <span className="font-mono text-xs">{history.order?.telegramChatId ?? "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (history: TrackingHistory) => history.status,
      className: "whitespace-normal min-w-96",
    },
    {
      key: "location",
      header: "Location",
      render: (history: TrackingHistory) => optionalText(history.location),
    },
    {
      key: "nextLocation",
      header: "Next Location",
      render: (history: TrackingHistory) => optionalText(history.nextLocation),
    },
    {
      key: "eventTime",
      header: "Event Time",
      render: (history: TrackingHistory) => formatDate(history.eventTime),
    },
    {
      key: "code",
      header: "Code",
      render: (history: TrackingHistory) => <span className="font-mono text-xs">{history.trackingCode}</span>,
    },
  ];

  const handleFilter = (event: FormEvent) => {
    event.preventDefault();

    const normalizedTrackingNumber = trackingInput.trim().toUpperCase();
    const normalizedChatId = chatInput.trim();
    const normalizedUserId = userInput.trim();

    if (normalizedTrackingNumber && !trackingNumberPattern.test(normalizedTrackingNumber)) {
      toast.error("Tracking number must look like SPXVN063015366786.");
      return;
    }

    const nextFilters = {
      trackingNumber: normalizedTrackingNumber,
      telegramChatId: normalizedChatId,
      userId: normalizedUserId,
    };
    const nextSearchParams = new URLSearchParams();

    if (nextFilters.trackingNumber) {
      nextSearchParams.set("trackingNumber", nextFilters.trackingNumber);
    }

    if (nextFilters.telegramChatId) {
      nextSearchParams.set("telegramChatId", nextFilters.telegramChatId);
    }

    if (nextFilters.userId) {
      nextSearchParams.set("userId", nextFilters.userId);
    }

    setFilters(nextFilters);
    setSearchParams(nextSearchParams, { replace: true });
  };

  const handleClear = () => {
    setTrackingInput("");
    setChatInput("");
    setUserInput("");
    setFilters({ trackingNumber: "", telegramChatId: "", userId: "" });
    setSearchParams({}, { replace: true });
  };

  if (isLoading || usersQuery.isLoading) return null;
  if (error || usersQuery.error) {
    return (
      <ErrorState
        message={((error || usersQuery.error) as Error).message}
        onRetry={() => {
          refetch();
          usersQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Tracking History</h1>

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[1fr_1fr_1.4fr_auto_auto] md:items-end"
      >
        <Input
          label="Tracking Number"
          placeholder="SPXVN063015366786"
          value={trackingInput}
          onChange={(event) => setTrackingInput(event.target.value)}
        />
        <Input
          label="Chat ID"
          placeholder="6142403832"
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
        />
        <UserFilterSelect
          label="User ID"
          users={usersQuery.data ?? []}
          value={userInput}
          onChange={setUserInput}
        />
        <Button type="submit">Filter</Button>
        <Button type="button" variant="secondary" onClick={handleClear}>
          Clear
        </Button>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {data.length > 0 ? (
          <PaginatedTable
            columns={columns}
            data={data}
            keyExtractor={(history) => String(history.id)}
            onRowClick={setSelectedHistory}
            initialPageSize={10}
          />
        ) : (
          <EmptyState message="No tracking history found" />
        )}
      </div>

      <Modal
        open={Boolean(selectedHistory)}
        onClose={() => setSelectedHistory(null)}
        title="Tracking History Detail"
        size="lg"
      >
        {selectedHistory && (
          <div className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Tracking Number</dt>
                <dd className="font-mono text-gray-900">{selectedHistory.order?.trackingNumber ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">User</dt>
                <dd className="text-gray-900">
                  {formatUser(selectedHistory.order?.user)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Telegram User ID</dt>
                <dd className="font-mono text-gray-900">{selectedHistory.order?.user?.telegramUserId ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Chat ID</dt>
                <dd className="font-mono text-gray-900">{selectedHistory.order?.telegramChatId ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Tracking Code</dt>
                <dd className="font-mono text-gray-900">{selectedHistory.trackingCode}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Event Time</dt>
                <dd className="text-gray-900">{formatDate(selectedHistory.eventTime)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Status</dt>
                <dd className="text-gray-900">{selectedHistory.status}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Location</dt>
                <dd className="text-gray-900">{optionalText(selectedHistory.location)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Next Location</dt>
                <dd className="text-gray-900">{optionalText(selectedHistory.nextLocation)}</dd>
              </div>
            </dl>
            <pre className="max-h-96 overflow-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-100">
              {JSON.stringify(selectedHistory.rawData, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}
