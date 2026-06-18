import { useState } from "react";
import type { Order } from "../lib/types";
import { formatVnd, formatDate } from "../lib/format";
import { useOrders, useRefundOrder } from "../hooks/useOrders";
import { Select } from "../components/ui/Select";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Table } from "../components/ui/Table";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);
  const [confirmRefund, setConfirmRefund] = useState<Order | null>(null);
  const refundMutation = useRefundOrder();

  const { data, isLoading, error, refetch } = useOrders(page, status);

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "PAID", label: "Paid" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "REFUNDED", label: "Refunded" },
  ];

  const columns = [
    { key: "code", header: "Code", render: (o: Order) => <span className="font-mono text-xs">{o.orderCode}</span> },
    { key: "user", header: "User", render: (o: Order) => o.user?.username || o.userId.slice(0, 8) },
    { key: "product", header: "Product", render: (o: Order) => o.productName },
    { key: "price", header: "Price", render: (o: Order) => formatVnd(o.price) },
    { key: "status", header: "Status", render: (o: Order) => <Badge status={o.status} /> },
    { key: "date", header: "Date", render: (o: Order) => <span className="text-gray-500">{formatDate(o.createdAt)}</span> },
  ];

  if (isLoading) return null;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const handleRefund = () => {
    if (!confirmRefund) return;
    refundMutation.mutate(confirmRefund.id, {
      onSuccess: () => {
        setConfirmRefund(null);
        setDetail(null);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="w-40">
          <Select options={statusOptions} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {data && data.items.length > 0 ? (
          <>
            <Table columns={columns} data={data.items} keyExtractor={(o) => o.id} onRowClick={(o) => setDetail(o)} />
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState message="No orders found" />
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Order Detail">
        {detail && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Code</dt><dd className="font-mono">{detail.orderCode}</dd>
              <dt className="text-gray-500">User</dt><dd>{detail.user?.username || detail.userId}</dd>
              <dt className="text-gray-500">Telegram ID</dt><dd>{detail.user?.telegramId}</dd>
              <dt className="text-gray-500">Product</dt><dd>{detail.productName}</dd>
              <dt className="text-gray-500">Price</dt><dd>{formatVnd(detail.price)}</dd>
              <dt className="text-gray-500">Status</dt><dd><Badge status={detail.status} /></dd>
              <dt className="text-gray-500">Date</dt><dd>{formatDate(detail.createdAt)}</dd>
            </dl>
            {detail.status === "PAID" && (
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button variant="danger" onClick={() => setConfirmRefund(detail)}>
                  Refund Order
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!confirmRefund} onClose={() => setConfirmRefund(null)} title="Confirm Refund" size="sm">
        {confirmRefund && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Refund <strong>{formatVnd(confirmRefund.price)}</strong> for order{" "}
              <code className="text-xs">{confirmRefund.orderCode}</code>? The amount will be credited back to the user's balance.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmRefund(null)}>Cancel</Button>
              <Button variant="danger" loading={refundMutation.isPending} onClick={handleRefund}>
                Confirm Refund
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
