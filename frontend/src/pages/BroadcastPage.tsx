import { useState } from "react";
import type { Broadcast } from "../lib/types";
import { formatDate } from "../lib/format";
import { useBroadcasts, useBroadcastPreview, useBroadcastSend } from "../hooks/useBroadcast";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { Badge } from "../components/ui/Badge";
import { Table } from "../components/ui/Table";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";

export function BroadcastPage() {
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Broadcast | null>(null);

  const [targetType, setTargetType] = useState("all");
  const [message, setMessage] = useState("");
  const [parseMode, setParseMode] = useState("plain");
  const [confirmSend, setConfirmSend] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useBroadcasts(page, true);
  const previewMut = useBroadcastPreview();
  const sendMut = useBroadcastSend();

  const handlePreview = () => {
    previewMut.mutate(targetType, {
      onSuccess: (data) => setPreviewCount(data.recipientCount),
    });
  };

  const handleSend = () => {
    sendMut.mutate({ targetType, message, parseMode, confirm: true }, {
      onSuccess: () => {
        setMessage("");
        setConfirmSend(false);
        setPreviewCount(null);
      },
    });
  };

  const targetOptions = [
    { value: "all", label: "All Users" },
    { value: "has_orders", label: "Users with Orders" },
    { value: "has_balance", label: "Users with Balance" },
    { value: "active", label: "Active Users" },
  ];

  const parseModeOptions = [
    { value: "plain", label: "Plain Text" },
    { value: "HTML", label: "HTML" },
  ];

  const columns = [
    { key: "date", header: "Date", render: (b: Broadcast) => <span className="text-gray-500">{formatDate(b.createdAt)}</span> },
    { key: "target", header: "Target", render: (b: Broadcast) => b.targetType },
    { key: "recipients", header: "Recipients", render: (b: Broadcast) => b.totalRecipients },
    { key: "sent", header: "Sent/Failed", render: (b: Broadcast) => <span>{b.sentCount}<span className="text-gray-400">/</span><span className="text-red-600">{b.failedCount}</span></span> },
    { key: "status", header: "Status", render: (b: Broadcast) => <Badge status={b.status} /> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Broadcast</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">New Broadcast</h2>
          <Select label="Target" options={targetOptions} value={targetType} onChange={(e) => { setTargetType(e.target.value); setPreviewCount(null); }} />
          <Textarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Enter broadcast message..." />
          <Select label="Parse Mode" options={parseModeOptions} value={parseMode} onChange={(e) => setParseMode(e.target.value)} />

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handlePreview} loading={previewMut.isPending}>
              Preview Recipients
            </Button>
            {previewCount !== null && (
              <span className="text-sm text-gray-600">
                {previewCount} recipients
              </span>
            )}
          </div>

          <Button onClick={() => setConfirmSend(true)} disabled={!message.trim()} className="w-full">
            Send Broadcast
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">History</h2>
          </div>
          {isLoading ? <Spinner /> : error ? <ErrorState message={(error as Error).message} onRetry={() => refetch()} /> :
            data && data.items.length > 0 ? (
              <>
                <Table columns={columns} data={data.items} keyExtractor={(b) => b.id} onRowClick={(b) => setDetail(b)} />
                <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
              </>
            ) : <EmptyState message="No broadcasts yet" />
          }
        </div>
      </div>

      <Modal open={confirmSend} onClose={() => setConfirmSend(false)} title="Confirm Broadcast" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to send this broadcast to <strong>{targetType}</strong> users?
          {previewCount !== null && <> ({previewCount} recipients)</>}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmSend(false)}>Cancel</Button>
          <Button loading={sendMut.isPending} onClick={handleSend}>Confirm Send</Button>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Broadcast Detail" size="lg">
        {detail && (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Admin</dt><dd>{detail.admin?.username || detail.admin?.firstName || detail.adminId}</dd>
              <dt className="text-gray-500">Target</dt><dd>{detail.targetType}</dd>
              <dt className="text-gray-500">Parse Mode</dt><dd>{detail.parseMode}</dd>
              <dt className="text-gray-500">Recipients</dt><dd>{detail.totalRecipients}</dd>
              <dt className="text-gray-500">Sent</dt><dd>{detail.sentCount}</dd>
              <dt className="text-gray-500">Failed</dt><dd>{detail.failedCount}</dd>
              <dt className="text-gray-500">Status</dt><dd><Badge status={detail.status} /></dd>
              <dt className="text-gray-500">Created</dt><dd>{formatDate(detail.createdAt)}</dd>
              {detail.startedAt && <><dt className="text-gray-500">Started</dt><dd>{formatDate(detail.startedAt)}</dd></>}
              {detail.finishedAt && <><dt className="text-gray-500">Finished</dt><dd>{formatDate(detail.finishedAt)}</dd></>}
            </dl>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Message</h4>
              <pre className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap">{detail.message}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
