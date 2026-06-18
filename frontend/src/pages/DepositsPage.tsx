import { useState } from "react";
import type { Deposit } from "../lib/types";
import { formatVnd, formatDate } from "../lib/format";
import { useDeposits, useConfirmDeposit, useCancelDeposit } from "../hooks/useDeposits";
import { Select } from "../components/ui/Select";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Table } from "../components/ui/Table";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";

type ConfirmAction = { deposit: Deposit; action: "confirm" | "cancel" } | null;

export function DepositsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<Deposit | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const { data, isLoading, error, refetch } = useDeposits(page, status);
  const confirmMutation = useConfirmDeposit();
  const cancelMutation = useCancelDeposit();

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "PENDING", label: "Pending" },
    { value: "PAID", label: "Paid" },
    { value: "EXPIRED", label: "Expired" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const columns = [
    { key: "code", header: "Code", render: (d: Deposit) => <span className="font-mono text-xs">{d.code}</span> },
    { key: "user", header: "User", render: (d: Deposit) => d.user?.username || d.telegramId },
    { key: "amount", header: "Amount", render: (d: Deposit) => formatVnd(d.amount) },
    { key: "status", header: "Status", render: (d: Deposit) => <Badge status={d.status} /> },
    { key: "date", header: "Date", render: (d: Deposit) => <span className="text-gray-500">{formatDate(d.createdAt)}</span> },
  ];

  if (isLoading) return null;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const mutation = confirmAction.action === "confirm" ? confirmMutation : cancelMutation;
    mutation.mutate(confirmAction.deposit.id, {
      onSuccess: () => {
        setConfirmAction(null);
        setDetail(null);
      },
    });
  };

  const isPending = confirmMutation.isPending || cancelMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Deposits</h1>
        <div className="w-40">
          <Select options={statusOptions} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {data && data.items.length > 0 ? (
          <>
            <Table columns={columns} data={data.items} keyExtractor={(d) => d.id} onRowClick={(d) => setDetail(d)} />
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState message="No deposits found" />
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Deposit Detail" size="lg">
        {detail && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Code</dt><dd className="font-mono">{detail.code}</dd>
              <dt className="text-gray-500">User</dt><dd>{detail.user?.username || detail.telegramId}</dd>
              <dt className="text-gray-500">Amount</dt><dd>{formatVnd(detail.amount)}</dd>
              <dt className="text-gray-500">Status</dt><dd><Badge status={detail.status} /></dd>
              <dt className="text-gray-500">Bank Tx ID</dt><dd>{detail.bankTransactionId || "—"}</dd>
              <dt className="text-gray-500">Created</dt><dd>{formatDate(detail.createdAt)}</dd>
              <dt className="text-gray-500">Expires</dt><dd>{formatDate(detail.expiredAt)}</dd>
              <dt className="text-gray-500">Paid At</dt><dd>{detail.paidAt ? formatDate(detail.paidAt) : "—"}</dd>
            </dl>
            {detail.rawTransaction != null && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Raw Transaction</h4>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto max-h-60">
                  {JSON.stringify(detail.rawTransaction, null, 2)}
                </pre>
              </div>
            )}
            {detail.status === "PENDING" && (
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button variant="danger" onClick={() => setConfirmAction({ deposit: detail, action: "cancel" })}>
                  Cancel Deposit
                </Button>
                <Button variant="primary" onClick={() => setConfirmAction({ deposit: detail, action: "confirm" })}>
                  Confirm Paid
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.action === "confirm" ? "Confirm Deposit" : "Cancel Deposit"} size="sm">
        {confirmAction && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {confirmAction.action === "confirm"
                ? <>Confirm deposit <code className="text-xs">{confirmAction.deposit.code}</code> as paid? <strong>{formatVnd(confirmAction.deposit.amount)}</strong> will be added to the user's balance.</>
                : <>Cancel deposit <code className="text-xs">{confirmAction.deposit.code}</code>? No balance change will occur.</>
              }
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>Go Back</Button>
              <Button
                variant={confirmAction.action === "confirm" ? "primary" : "danger"}
                loading={isPending}
                onClick={handleConfirmAction}
              >
                {confirmAction.action === "confirm" ? "Confirm Paid" : "Cancel Deposit"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
