import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserDetail, useUserOrders, useUserDeposits, useUserWallet, useToggleBlockUser, useAdjustBalance } from "../hooks/useUsers";
import type { UserOrder, UserDeposit, WalletTx } from "../hooks/useUsers";
import { formatVnd, formatDate } from "../lib/format";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Table } from "../components/ui/Table";
import { Pagination } from "../components/ui/Pagination";
import { Spinner } from "../components/ui/Spinner";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";

type Tab = "orders" | "deposits" | "wallet";

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading, error, refetch } = useUserDetail(id ?? null);
  const toggleBlock = useToggleBlockUser();
  const adjustBalance = useAdjustBalance();
  const [tab, setTab] = useState<Tab>("orders");
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustDir, setAdjustDir] = useState<"add" | "sub">("add");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  if (isLoading) return null;
  if (error || !user) return <ErrorState message={(error as Error)?.message || "User not found"} onRetry={() => refetch()} />;

  const handleToggleBlock = () => {
    toggleBlock.mutate(user.id, { onSuccess: () => setConfirmBlock(false) });
  };

  const handleAdjustBalance = () => {
    const amount = Number(adjustAmount);
    if (!Number.isInteger(amount) || amount <= 0) return;
    adjustBalance.mutate(
      { userId: user.id, direction: adjustDir, amount, note: adjustNote || undefined },
      {
        onSuccess: () => {
          setShowAdjust(false);
          setAdjustAmount("");
          setAdjustNote("");
        },
      }
    );
  };

  const openAdjust = () => {
    setAdjustDir("add");
    setAdjustAmount("");
    setAdjustNote("");
    setShowAdjust(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/users")} className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">User Detail</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-500 uppercase">Telegram ID</span>
              <p className="font-mono text-sm">{user.telegramId}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Username</span>
              <p className="text-sm">{user.username || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Name</span>
              <p className="text-sm">{[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Balance</span>
              <p className="text-sm font-semibold">{formatVnd(user.balance)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Role</span>
              <p className="text-sm"><Badge status={user.role} /></p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Status</span>
              <p className="text-sm">
                <span className={`font-medium ${user.isBlocked ? "text-red-600" : "text-green-600"}`}>
                  {user.isBlocked ? "Blocked" : "Active"}
                </span>
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Joined</span>
              <p className="text-sm text-gray-500">{formatDate(user.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{user.orderCount}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{user.depositCount}</p>
              <p className="text-xs text-gray-500">Deposits</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{user.walletTxCount}</p>
              <p className="text-xs text-gray-500">Transactions</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button variant="secondary" className="w-full" onClick={openAdjust}>
              Adjust Balance
            </Button>
            <Button
              variant={user.isBlocked ? "primary" : "danger"}
              className="w-full"
              onClick={() => setConfirmBlock(true)}
            >
              {user.isBlocked ? "Unblock User" : "Block User"}
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {(["orders", "deposits", "wallet"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition capitalize ${
                  tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "orders" && <OrdersTab userId={user.id} />}
          {tab === "deposits" && <DepositsTab userId={user.id} />}
          {tab === "wallet" && <WalletTab userId={user.id} />}
        </div>
      </div>

      <Modal open={confirmBlock} onClose={() => setConfirmBlock(false)} title={user.isBlocked ? "Unblock User" : "Block User"} size="sm">
        <p className="text-sm text-gray-600 mb-4">
          {user.isBlocked
            ? `Are you sure you want to unblock ${user.username || user.telegramId}?`
            : `Are you sure you want to block ${user.username || user.telegramId}? They will not be able to use the bot.`
          }
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmBlock(false)}>Cancel</Button>
          <Button variant={user.isBlocked ? "primary" : "danger"} loading={toggleBlock.isPending} onClick={handleToggleBlock}>
            {user.isBlocked ? "Unblock" : "Block"}
          </Button>
        </div>
      </Modal>

      <Modal open={showAdjust} onClose={() => setShowAdjust(false)} title="Adjust Balance" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAdjustDir("add")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition ${
                  adjustDir === "add"
                    ? "bg-green-50 border-green-300 text-green-700"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                + Add
              </button>
              <button
                onClick={() => setAdjustDir("sub")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition ${
                  adjustDir === "sub"
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                - Subtract
              </button>
            </div>
          </div>
          <Input
            label="Amount (VND)"
            type="number"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            placeholder="e.g. 50000"
          />
          <Input
            label="Note (optional)"
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
            placeholder="Reason for adjustment"
          />
          <p className="text-xs text-gray-500">
            Current balance: <strong>{formatVnd(user.balance)}</strong>
            {adjustAmount && Number(adjustAmount) > 0 && (
              <> → <strong>{formatVnd(user.balance + (adjustDir === "add" ? Number(adjustAmount) : -Number(adjustAmount)))}</strong></>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdjust(false)}>Cancel</Button>
            <Button
              variant={adjustDir === "add" ? "primary" : "danger"}
              loading={adjustBalance.isPending}
              onClick={handleAdjustBalance}
              disabled={!adjustAmount || Number(adjustAmount) <= 0}
            >
              {adjustDir === "add" ? "Add Balance" : "Subtract Balance"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function OrdersTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useUserOrders(userId, page);

  const columns = [
    { key: "code", header: "Code", render: (o: UserOrder) => <span className="font-mono text-xs">{o.orderCode}</span> },
    { key: "product", header: "Product", render: (o: UserOrder) => o.productName },
    { key: "price", header: "Price", render: (o: UserOrder) => formatVnd(o.price) },
    { key: "status", header: "Status", render: (o: UserOrder) => <Badge status={o.status} /> },
    { key: "date", header: "Date", render: (o: UserOrder) => <span className="text-gray-500">{formatDate(o.createdAt)}</span> },
  ];

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {data && data.items.length > 0 ? (
        <>
          <Table columns={columns} data={data.items} keyExtractor={(o) => o.id} />
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      ) : <EmptyState message="No orders" />}
    </div>
  );
}

function DepositsTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useUserDeposits(userId, page);

  const columns = [
    { key: "code", header: "Code", render: (d: UserDeposit) => <span className="font-mono text-xs">{d.code}</span> },
    { key: "amount", header: "Amount", render: (d: UserDeposit) => formatVnd(d.amount) },
    { key: "status", header: "Status", render: (d: UserDeposit) => <Badge status={d.status} /> },
    { key: "created", header: "Created", render: (d: UserDeposit) => <span className="text-gray-500">{formatDate(d.createdAt)}</span> },
    { key: "paid", header: "Paid At", render: (d: UserDeposit) => <span className="text-gray-500">{d.paidAt ? formatDate(d.paidAt) : "—"}</span> },
  ];

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {data && data.items.length > 0 ? (
        <>
          <Table columns={columns} data={data.items} keyExtractor={(d) => d.id} />
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      ) : <EmptyState message="No deposits" />}
    </div>
  );
}

function WalletTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useUserWallet(userId, page);

  const columns = [
    { key: "type", header: "Type", render: (t: WalletTx) => <Badge status={t.type} /> },
    { key: "amount", header: "Amount", render: (t: WalletTx) => <span className={t.amount >= 0 ? "text-green-600" : "text-red-600"}>{t.amount >= 0 ? "+" : ""}{formatVnd(t.amount)}</span> },
    { key: "before", header: "Before", render: (t: WalletTx) => formatVnd(t.balanceBefore) },
    { key: "after", header: "After", render: (t: WalletTx) => formatVnd(t.balanceAfter) },
    { key: "note", header: "Note", render: (t: WalletTx) => <span className="text-gray-500 text-xs">{t.note || "—"}</span> },
    { key: "date", header: "Date", render: (t: WalletTx) => <span className="text-gray-500">{formatDate(t.createdAt)}</span> },
  ];

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {data && data.items.length > 0 ? (
        <>
          <Table columns={columns} data={data.items} keyExtractor={(t) => t.id} />
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      ) : <EmptyState message="No transactions" />}
    </div>
  );
}
