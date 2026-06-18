import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../lib/types";
import { formatVnd, formatDate } from "../lib/format";
import { useUsers } from "../hooks/useUsers";
import { Badge } from "../components/ui/Badge";
import { Table } from "../components/ui/Table";
import { Pagination } from "../components/ui/Pagination";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";

export function UsersPage() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useUsers(page);

  const columns = [
    { key: "telegramId", header: "Telegram ID", render: (u: User) => <span className="font-mono text-xs">{u.telegramId}</span> },
    { key: "username", header: "Username", render: (u: User) => u.username || "—" },
    { key: "name", header: "Name", render: (u: User) => [u.firstName, u.lastName].filter(Boolean).join(" ") || "—" },
    { key: "balance", header: "Balance", render: (u: User) => formatVnd(u.balance) },
    { key: "role", header: "Role", render: (u: User) => <Badge status={u.role} /> },
    {
      key: "blocked", header: "Status", render: (u: User) => (
        <span className={`text-xs font-medium ${u.isBlocked ? "text-red-600" : "text-green-600"}`}>
          {u.isBlocked ? "Blocked" : "Active"}
        </span>
      ),
    },
    { key: "created", header: "Created", render: (u: User) => <span className="text-gray-500">{formatDate(u.createdAt)}</span> },
  ];

  if (isLoading) return null;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {data && data.items.length > 0 ? (
          <>
            <Table columns={columns} data={data.items} keyExtractor={(u) => u.id} onRowClick={(u) => navigate(`/users/${u.id}`)} />
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState message="No users found" />
        )}
      </div>
    </div>
  );
}
