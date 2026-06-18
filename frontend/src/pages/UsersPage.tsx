import { useNavigate } from "react-router-dom";
import type { User } from "../lib/types/user";
import { formatDate } from "../lib/format";
import { useUsers } from "../hooks/useUsers";
import { Button } from "../components/ui/Button";
import { PaginatedTable } from "../components/ui/PaginatedTable";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";

export function UsersPage() {
  const navigate = useNavigate();
  const { data = [], isLoading, error, refetch } = useUsers();

  const columns = [
    {
      key: "id",
      header: "User ID",
      render: (user: User) => <span className="font-mono text-xs">#{user.id}</span>,
    },
    {
      key: "telegramId",
      header: "Telegram User ID",
      render: (user: User) => <span className="font-mono text-xs">{user.telegramUserId}</span>,
    },
    { key: "username", header: "Username", render: (user: User) => user.username ? `@${user.username}` : "-" },
    {
      key: "name",
      header: "Name",
      render: (user: User) => [user.firstName, user.lastName].filter(Boolean).join(" ") || "-",
    },
    {
      key: "createdAt",
      header: "Created At",
      render: (user: User) => <span className="text-gray-500">{formatDate(user.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (user: User) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/tracking-history?userId=${user.id}`)}
          >
            History
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ];

  if (isLoading) return null;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Telegram Users</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {data.length > 0 ? (
          <PaginatedTable columns={columns} data={data} keyExtractor={(user) => String(user.id)} initialPageSize={10} />
        ) : (
          <EmptyState message="No Telegram users collected yet" />
        )}
      </div>
    </div>
  );
}
