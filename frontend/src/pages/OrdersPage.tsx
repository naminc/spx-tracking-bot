import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { TrackingHistory, TrackingOrder, TrackingUser } from "../lib/types/tracking";
import { formatDate } from "../lib/format";
import {
  useCreateTrackingOrder,
  useDeleteTrackingOrder,
  useTrackingHistories,
  useTrackingOrders,
} from "../hooks/useTracking";
import { useUsers } from "../hooks/useUsers";
import { UserFilterSelect } from "../components/UserFilterSelect";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PaginatedTable } from "../components/ui/PaginatedTable";

const trackingNumberPattern = /^SPXVN[A-Z0-9]{6,40}$/i;
const maxOrderNoteLength = 512;

function optionalText(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatUser(user: TrackingUser | null | undefined) {
  if (!user) return "-";

  const prefix = `#${user.id}`;

  if (user.username) return `${prefix} - @${user.username}`;

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  if (fullName) return `${prefix} - ${fullName} (${user.telegramUserId})`;

  return `${prefix} - ${user.telegramUserId}`;
}

function HistoryList({ trackingNumber }: { trackingNumber: string }) {
  const { data = [], isLoading, error, refetch } = useTrackingHistories({
    trackingNumber,
    limit: 100,
  });

  const columns = [
    {
      key: "eventTime",
      header: "Time",
      render: (history: TrackingHistory) => formatDate(history.eventTime),
    },
    {
      key: "status",
      header: "Status",
      render: (history: TrackingHistory) => history.status,
      className: "whitespace-normal min-w-72",
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
      key: "code",
      header: "Code",
      render: (history: TrackingHistory) => <span className="font-mono text-xs">{history.trackingCode}</span>,
    },
  ];

  if (isLoading) return null;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  return data.length > 0 ? (
    <PaginatedTable columns={columns} data={data} keyExtractor={(history) => String(history.id)} initialPageSize={10} />
  ) : (
    <EmptyState message="No tracking history found" />
  );
}

export function OrdersPage() {
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [chatFilter, setChatFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [trackingFilterInput, setTrackingFilterInput] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    trackingNumber: "",
    telegramChatId: "",
    userId: "",
  });
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedAddUserId, setSelectedAddUserId] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [note, setNote] = useState("");
  const [historyOrder, setHistoryOrder] = useState<TrackingOrder | null>(null);
  const { data = [], isLoading, error, refetch } = useTrackingOrders({
    includeCompleted,
    trackingNumber: appliedFilters.trackingNumber || undefined,
    telegramChatId: appliedFilters.telegramChatId || undefined,
    userId: appliedFilters.userId || undefined,
  });
  const usersQuery = useUsers();
  const createOrder = useCreateTrackingOrder();
  const deleteOrder = useDeleteTrackingOrder();

  const stats = useMemo(
    () => ({
      total: data.length,
      active: data.filter((order) => !order.isCompleted).length,
      completed: data.filter((order) => order.isCompleted).length,
    }),
    [data],
  );

  const columns = [
    {
      key: "trackingNumber",
      header: "Tracking Number",
      render: (order: TrackingOrder) => <span className="font-mono text-xs">{order.trackingNumber}</span>,
    },
    {
      key: "note",
      header: "Note",
      render: (order: TrackingOrder) => optionalText(order.note),
      className: "whitespace-normal min-w-48",
    },
    {
      key: "chat",
      header: "Chat ID",
      render: (order: TrackingOrder) => <span className="font-mono text-xs">{order.telegramChatId}</span>,
    },
    {
      key: "user",
      header: "User",
      render: (order: TrackingOrder) => (
        <span className="text-xs">{formatUser(order.user)}</span>
      ),
    },
    {
      key: "status",
      header: "Current Status",
      render: (order: TrackingOrder) => order.currentStatus,
      className: "whitespace-normal min-w-80",
    },
    {
      key: "finalStatus",
      header: "Final",
      render: (order: TrackingOrder) => <Badge status={order.finalStatus} />,
    },
    {
      key: "location",
      header: "Location",
      render: (order: TrackingOrder) => optionalText(order.currentLocation),
    },
    {
      key: "nextLocation",
      header: "Next Location",
      render: (order: TrackingOrder) => optionalText(order.nextLocation),
    },
    {
      key: "lastEventTime",
      header: "Last Event",
      render: (order: TrackingOrder) => formatDate(order.lastEventTime),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (order: TrackingOrder) => formatDate(order.createdAt),
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (order: TrackingOrder) => formatDate(order.updatedAt),
    },
    {
      key: "actions",
      header: "",
      render: (order: TrackingOrder) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setHistoryOrder(order);
            }}
          >
            History
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={deleteOrder.isPending}
            onClick={(event) => {
              event.stopPropagation();
              deleteOrder.mutate({
                trackingNumber: order.trackingNumber,
                telegramChatId: order.telegramChatId,
              });
            }}
          >
            Delete
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ];

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedTelegramChatId = telegramChatId.trim();
    if (!normalizedTelegramChatId) {
      toast.error("Vui lòng chọn user hoặc nhập Telegram Chat ID");
      return;
    }

    const normalizedNote = note.trim();

    if (normalizedNote.length > maxOrderNoteLength) {
      toast.error(`Note must be at most ${maxOrderNoteLength} characters.`);
      return;
    }

    const created = await createOrder.mutateAsync({
      trackingNumber,
      telegramChatId: normalizedTelegramChatId,
      note: normalizedNote || undefined,
    });
    setTrackingNumber("");
    setNote("");
    setTelegramChatId(created.order.telegramChatId);
  };

  const handleAddUserChange = (userId: string) => {
    setSelectedAddUserId(userId);

    if (!userId) {
      setTelegramChatId("");
      return;
    }

    const selectedUser = usersQuery.data?.find((user) => String(user.id) === userId);
    if (selectedUser) {
      setTelegramChatId(selectedUser.telegramUserId);
    }
  };

  const handleFilter = (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedTrackingNumber = trackingFilterInput.trim().toUpperCase();

    if (normalizedTrackingNumber && !trackingNumberPattern.test(normalizedTrackingNumber)) {
      toast.error("Tracking number must look like SPXVN063015366786.");
      return;
    }

    setAppliedFilters({
      trackingNumber: normalizedTrackingNumber,
      telegramChatId: chatFilter.trim(),
      userId: userFilter,
    });
    setTrackingFilterInput(normalizedTrackingNumber);
  };

  const handleClearFilter = () => {
    setTrackingFilterInput("");
    setChatFilter("");
    setUserFilter("");
    setAppliedFilters({ trackingNumber: "", telegramChatId: "", userId: "" });
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-gray-200 bg-white text-center text-sm">
          <div className="px-4 py-2">
            <div className="font-semibold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="border-x border-gray-200 px-4 py-2">
            <div className="font-semibold text-gray-900">{stats.active}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="px-4 py-2">
            <div className="font-semibold text-gray-900">{stats.completed}</div>
            <div className="text-xs text-gray-500">Done</div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[1fr_1.1fr_220px_1fr_auto]"
      >
        <Input
          label="Tracking Number"
          placeholder="SPXVN063015366786"
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          required
        />
        <UserFilterSelect
          label="User"
          users={usersQuery.data ?? []}
          value={selectedAddUserId}
          onChange={handleAddUserChange}
          placeholder="Select user"
        />
        <Input
          label="Telegram Chat ID"
          placeholder="6142403832"
          value={telegramChatId}
          onChange={(event) => setTelegramChatId(event.target.value)}
        />
        <Input
          label="Note"
          placeholder="Hàng của khách A"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={maxOrderNoteLength}
        />
        <div className="flex items-end">
          <Button type="submit" loading={createOrder.isPending} className="w-full">
            Add Order
          </Button>
        </div>
      </form>

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[1fr_1fr_1.4fr_auto_auto_auto] md:items-end"
      >
        <Input
          label="Tracking Number"
          value={trackingFilterInput}
          onChange={(event) => setTrackingFilterInput(event.target.value)}
          placeholder="SPXVN063015366786"
        />
        <Input
          label="Chat ID"
          value={chatFilter}
          onChange={(event) => setChatFilter(event.target.value)}
          placeholder="6142403832"
        />
        <UserFilterSelect
          label="User ID"
          users={usersQuery.data ?? []}
          value={userFilter}
          onChange={setUserFilter}
        />
        <label className="flex h-10 items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={(event) => setIncludeCompleted(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Include completed
        </label>
        <Button type="submit">Filter</Button>
        <Button type="button" variant="secondary" onClick={handleClearFilter}>
          Clear
        </Button>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {data.length > 0 ? (
          <PaginatedTable columns={columns} data={data} keyExtractor={(order) => String(order.id)} initialPageSize={10} />
        ) : (
          <EmptyState message="No orders found" />
        )}
      </div>

      <Modal
        open={Boolean(historyOrder)}
        onClose={() => setHistoryOrder(null)}
        title={historyOrder ? `History ${historyOrder.trackingNumber}` : "History"}
        size="lg"
      >
        {historyOrder && <HistoryList trackingNumber={historyOrder.trackingNumber} />}
      </Modal>
    </div>
  );
}
