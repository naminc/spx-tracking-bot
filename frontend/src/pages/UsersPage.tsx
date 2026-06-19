import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { User } from "../lib/types/user";
import { formatDate } from "../lib/format";
import { useUsers, type UserProfileFilter } from "../hooks/useUsers";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PaginatedTable } from "../components/ui/PaginatedTable";
import { ErrorState } from "../components/ui/ErrorState";

type ProfileFilterValue = UserProfileFilter | "";

export function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<ProfileFilterValue>("");
  const normalizedSearch = search.trim();
  const { data = [], isLoading, isFetching, error, refetch } = useUsers({
    q: normalizedSearch || undefined,
    profile: profile || undefined,
  });
  const tableResetKey = `${normalizedSearch}|${profile}`;
  const errorMessage = error ? (error as Error).message : "";

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage, { id: "users-filter-error" });
    }
  }, [errorMessage]);

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

  const handleClear = () => {
    setSearch("");
    setProfile("");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Telegram Users</h1>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[1fr_220px_auto] md:items-end">
        <Input
          label="Search"
          placeholder="Telegram ID, username, first name, last name..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div>
          <label htmlFor="user-profile-filter" className="mb-1 block text-sm font-medium text-gray-700">
            Profile
          </label>
          <select
            id="user-profile-filter"
            value={profile}
            onChange={(event) => setProfile(event.target.value as ProfileFilterValue)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All users</option>
            <option value="HAS_PROFILE">Has profile</option>
            <option value="MISSING_PROFILE">Missing profile</option>
          </select>
        </div>
        <Button type="button" variant="secondary" onClick={handleClear}>
          Clear
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {error ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : (
          <PaginatedTable
            columns={columns}
            data={data}
            keyExtractor={(user) => String(user.id)}
            initialPageSize={10}
            resetKey={tableResetKey}
            loading={isLoading || isFetching}
            emptyMessage="No Telegram users found"
          />
        )}
      </div>
    </div>
  );
}
