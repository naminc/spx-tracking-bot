import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type {
  FinalStatus,
  TrackingCarrier,
  TrackingHistory,
  TrackingOrder,
  TrackingUser,
} from "../lib/types/tracking";
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

const maxOrderNoteLength = 512;
type OrderStatusFilter = FinalStatus | "";
type CarrierFilter = TrackingCarrier | "";
type CarrierInput = TrackingCarrier | "AUTO";
const jntPhoneLast4Pattern = /^\d{4}$/;
const numericJntTrackingNumberPattern = /^[0-9]{6,32}$/;
const positiveIntegerPattern = /^[1-9]\d*$/;

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

function HistoryList({ carrier, trackingNumber }: { carrier: TrackingCarrier; trackingNumber: string }) {
  const { data = [], isLoading, error, refetch } = useTrackingHistories({
    carrier,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdFromUrl = searchParams.get("userId") ?? "";
  const [carrierFilter, setCarrierFilter] = useState<CarrierFilter>("");
  const [chatFilter, setChatFilter] = useState("");
  const [userFilter, setUserFilter] = useState(() =>
    positiveIntegerPattern.test(userIdFromUrl) ? userIdFromUrl : "",
  );
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("");
  const [trackingFilterInput, setTrackingFilterInput] = useState("");
  const [addCarrier, setAddCarrier] = useState<CarrierInput>("AUTO");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedAddUserId, setSelectedAddUserId] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [trackingCredential, setTrackingCredential] = useState("");
  const [note, setNote] = useState("");
  const [historyOrder, setHistoryOrder] = useState<TrackingOrder | null>(null);
  const normalizedTrackingFilter = trackingFilterInput.trim().toUpperCase();
  const normalizedChatFilter = chatFilter.trim();
  const { data = [], isLoading, isFetching, error, refetch } = useTrackingOrders({
    includeCompleted: true,
    carrier: carrierFilter || undefined,
    trackingNumber: normalizedTrackingFilter || undefined,
    telegramChatId: normalizedChatFilter || undefined,
    userId: userFilter || undefined,
    finalStatus: statusFilter || undefined,
  });
  const usersQuery = useUsers();
  const createOrder = useCreateTrackingOrder();
  const deleteOrder = useDeleteTrackingOrder();
  const tableResetKey = `${carrierFilter}|${normalizedTrackingFilter}|${normalizedChatFilter}|${userFilter}|${statusFilter}`;
  const shouldShowJntCredential =
    addCarrier === "JNT" || (addCarrier === "AUTO" && numericJntTrackingNumberPattern.test(trackingNumber.trim()));

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
      key: "carrier",
      header: "Carrier",
      render: (order: TrackingOrder) => <Badge status={order.carrier} />,
    },
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
                carrier: order.carrier,
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
    const normalizedTrackingCredential = trackingCredential.trim();

    if (shouldShowJntCredential && !jntPhoneLast4Pattern.test(normalizedTrackingCredential)) {
      toast.error("J&T phone last 4 must contain exactly 4 digits.");
      return;
    }

    if (normalizedNote.length > maxOrderNoteLength) {
      toast.error(`Note must be at most ${maxOrderNoteLength} characters.`);
      return;
    }

    const created = await createOrder.mutateAsync({
      carrier: addCarrier,
      trackingNumber,
      telegramChatId: normalizedTelegramChatId,
      note: normalizedNote || undefined,
      trackingCredential: normalizedTrackingCredential || undefined,
    });
    setTrackingNumber("");
    setNote("");
    setTrackingCredential("");
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

  const handleClearFilter = () => {
    setCarrierFilter("");
    setTrackingFilterInput("");
    setChatFilter("");
    setUserFilter("");
    setStatusFilter("");
    setSearchParams({}, { replace: true });
  };

  const tableError = error || usersQuery.error;
  const tableErrorMessage = tableError ? (tableError as Error).message : "";

  useEffect(() => {
    if (tableErrorMessage) {
      toast.error(tableErrorMessage, { id: "orders-filter-error" });
    }
  }, [tableErrorMessage]);

  useEffect(() => {
    setUserFilter(positiveIntegerPattern.test(userIdFromUrl) ? userIdFromUrl : "");
  }, [userIdFromUrl]);

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
        className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[160px_1fr_1.1fr_180px_220px_1fr_auto]"
      >
        <div>
          <label htmlFor="add-carrier" className="mb-1 block text-sm font-medium text-gray-700">
            Carrier
          </label>
          <select
            id="add-carrier"
            value={addCarrier}
            onChange={(event) => setAddCarrier(event.target.value as CarrierInput)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="AUTO">Auto</option>
            <option value="SPX">SPX</option>
            <option value="GHN">GHN</option>
            <option value="JNT">J&amp;T</option>
          </select>
        </div>
        <Input
          label="Tracking Number"
          placeholder="SPXVN063015366786, GYH9PRA6, or 862195772225"
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
          disabled={usersQuery.isLoading}
        />
        <Input
          label="Telegram Chat ID"
          placeholder="6142403832"
          value={telegramChatId}
          onChange={(event) => setTelegramChatId(event.target.value)}
        />
        <Input
          label="Phone last 4"
          placeholder="9613"
          value={trackingCredential}
          onChange={(event) => setTrackingCredential(event.target.value)}
          maxLength={4}
          disabled={!shouldShowJntCredential}
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

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[150px_1fr_1fr_1.4fr_180px_auto] md:items-end">
        <div>
          <label htmlFor="order-carrier-filter" className="mb-1 block text-sm font-medium text-gray-700">
            Carrier
          </label>
          <select
            id="order-carrier-filter"
            value={carrierFilter}
            onChange={(event) => setCarrierFilter(event.target.value as CarrierFilter)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All carriers</option>
            <option value="SPX">SPX</option>
            <option value="GHN">GHN</option>
            <option value="JNT">J&amp;T</option>
          </select>
        </div>
        <Input
          label="Tracking Number"
          value={trackingFilterInput}
          onChange={(event) => setTrackingFilterInput(event.target.value)}
          placeholder="SPXVN063015366786, GYH9PRA6, or 862195772225"
        />
        <Input
          label="Chat ID / Username"
          value={chatFilter}
          onChange={(event) => setChatFilter(event.target.value)}
          placeholder="6142403832 or @naminc"
        />
        <UserFilterSelect
          label="User ID"
          users={usersQuery.data ?? []}
          value={userFilter}
          onChange={setUserFilter}
          disabled={usersQuery.isLoading}
        />
        <div>
          <label htmlFor="order-status-filter" className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="order-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as OrderStatusFilter)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <Button type="button" variant="secondary" onClick={handleClearFilter}>
          Clear
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {tableError ? (
          <ErrorState
            message={(tableError as Error).message}
            onRetry={() => {
              refetch();
              usersQuery.refetch();
            }}
          />
        ) : (
          <PaginatedTable
            columns={columns}
            data={data}
            keyExtractor={(order) => String(order.id)}
            initialPageSize={10}
            resetKey={tableResetKey}
            loading={isLoading || isFetching}
            emptyMessage="No orders found"
          />
        )}
      </div>

      <Modal
        open={Boolean(historyOrder)}
        onClose={() => setHistoryOrder(null)}
        title={historyOrder ? `History ${historyOrder.carrier} ${historyOrder.trackingNumber}` : "History"}
        size="lg"
      >
        {historyOrder && (
          <HistoryList carrier={historyOrder.carrier} trackingNumber={historyOrder.trackingNumber} />
        )}
      </Modal>
    </div>
  );
}
