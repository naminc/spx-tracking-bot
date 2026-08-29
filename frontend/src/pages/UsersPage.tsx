import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { User } from "../lib/types/user";
import { formatDate } from "../lib/format";
import {
  useBlockUser,
  useBulkDeleteUsers,
  useClearZeroOrderUsers,
  useDeleteUser,
  useUnblockUser,
  useUsers,
  useZeroOrderUsersPreview,
  type UserProfileFilter,
  type UserSort,
} from "../hooks/useUsers";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PaginatedTable } from "../components/ui/PaginatedTable";
import { ErrorState } from "../components/ui/ErrorState";

type ProfileFilterValue = UserProfileFilter | "";

function parseUserIdTokens(value: string) {
  const tokens = value
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const normalizedTokens = tokens.map((token) => token.replace(/^#/, ""));
  const invalidTokens = tokens.filter((token, index) => !/^[1-9]\d*$/.test(normalizedTokens[index]));
  const userIds = [
    ...new Set(
      normalizedTokens
        .filter((token) => /^[1-9]\d*$/.test(token))
        .map(Number),
    ),
  ];

  return { userIds, invalidTokens };
}

function formatUserSummary(user: User) {
  const username = user.username ? `@${user.username}` : "-";
  return `#${user.id} | TG ${user.telegramUserId} | ${username}`;
}

export function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<ProfileFilterValue>("");
  const [sort, setSort] = useState<UserSort>("CREATED_DESC");
  const [blockTarget, setBlockTarget] = useState<User | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteInput, setBulkDeleteInput] = useState("");
  const [clearZeroOrderOpen, setClearZeroOrderOpen] = useState(false);
  const [unblockUserId, setUnblockUserId] = useState<number | null>(null);
  const normalizedSearch = search.trim();
  const { data = [], isLoading, isFetching, error, refetch } = useUsers({
    q: normalizedSearch || undefined,
    profile: profile || undefined,
    sort,
  });
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const deleteUser = useDeleteUser();
  const bulkDeleteUsers = useBulkDeleteUsers();
  const clearZeroOrderUsers = useClearZeroOrderUsers();
  const zeroOrderPreview = useZeroOrderUsersPreview(clearZeroOrderOpen);
  const bulkDeletePreview = useMemo(() => parseUserIdTokens(bulkDeleteInput), [bulkDeleteInput]);
  const zeroOrderUsersCount = zeroOrderPreview.data?.count ?? 0;
  const tableResetKey = `${normalizedSearch}|${profile}|${sort}`;
  const errorMessage = error ? (error as Error).message : "";
  const zeroOrderPreviewErrorMessage = zeroOrderPreview.error
    ? (zeroOrderPreview.error as Error).message
    : "";

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage, { id: "users-filter-error" });
    }
  }, [errorMessage]);

  useEffect(() => {
    if (zeroOrderPreviewErrorMessage) {
      toast.error(zeroOrderPreviewErrorMessage, { id: "zero-order-preview-error" });
    }
  }, [zeroOrderPreviewErrorMessage]);

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
    {
      key: "username",
      header: "Username",
      render: (user: User) => (user.username ? `@${user.username}` : "-"),
    },
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
      key: "ordersCount",
      header: "Orders",
      render: (user: User) => <span className="font-mono text-xs">{user.ordersCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (user: User) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            user.isBlocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {user.isBlocked ? "Blocked" : "Active"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (user: User) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/orders?userId=${user.id}`)}
          >
            Orders
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/tracking-history?userId=${user.id}`)}
          >
            History
          </Button>
          {user.isBlocked ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={unblockUser.isPending && unblockUserId === user.id}
              onClick={async () => {
                if (!window.confirm(`Unblock user #${user.id}?`)) return;

                setUnblockUserId(user.id);
                try {
                  await unblockUser.mutateAsync(user.id);
                } finally {
                  setUnblockUserId(null);
                }
              }}
            >
              Unblock
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                setBlockTarget(user);
                setBlockReason("");
              }}
            >
              Block
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={deleteUser.isPending && deleteTarget?.id === user.id}
            onClick={() => setDeleteTarget(user)}
          >
            Delete
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ];

  const handleClear = () => {
    setSearch("");
    setProfile("");
    setSort("CREATED_DESC");
  };

  const handleBlockSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!blockTarget) return;

    await blockUser.mutateAsync({
      id: blockTarget.id,
      reason: blockReason,
    });
    setBlockTarget(null);
    setBlockReason("");
  };

  const handleDeleteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!deleteTarget) return;

    await deleteUser.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleBulkDeleteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (bulkDeletePreview.invalidTokens.length > 0) {
      toast.error(`Invalid user IDs: ${bulkDeletePreview.invalidTokens.join(", ")}`);
      return;
    }

    if (bulkDeletePreview.userIds.length === 0) {
      toast.error("Please enter at least one User ID or Telegram User ID");
      return;
    }

    await bulkDeleteUsers.mutateAsync(bulkDeletePreview.userIds);
    setBulkDeleteOpen(false);
    setBulkDeleteInput("");
  };

  const handleClearZeroOrderSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (zeroOrderUsersCount === 0) {
      toast.error("There are no zero-order users to delete");
      return;
    }

    await clearZeroOrderUsers.mutateAsync();
    setClearZeroOrderOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Telegram Users</h1>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setClearZeroOrderOpen(true)}>
            Clear zero-order users
          </Button>
          <Button type="button" variant="danger" onClick={() => setBulkDeleteOpen(true)}>
            Delete by IDs
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[1fr_220px_180px_auto] md:items-end">
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
        <div>
          <label htmlFor="user-sort" className="mb-1 block text-sm font-medium text-gray-700">
            Sort
          </label>
          <select
            id="user-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as UserSort)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="CREATED_DESC">Newest</option>
            <option value="ORDERS_DESC">Most orders</option>
            <option value="ORDERS_ASC">Fewest orders</option>
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

      <Modal
        open={Boolean(blockTarget)}
        onClose={() => {
          if (!blockUser.isPending) {
            setBlockTarget(null);
            setBlockReason("");
          }
        }}
        title={blockTarget ? `Block user #${blockTarget.id}` : "Block user"}
        size="sm"
      >
        <form className="space-y-4" onSubmit={handleBlockSubmit}>
          <div>
            <label htmlFor="block-reason" className="mb-1 block text-sm font-medium text-gray-700">
              Reason
            </label>
            <textarea
              id="block-reason"
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              maxLength={512}
              rows={4}
              placeholder="Optional"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{blockReason.length}/512</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setBlockTarget(null);
                setBlockReason("");
              }}
              disabled={blockUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={blockUser.isPending}>
              Block
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteUser.isPending) {
            setDeleteTarget(null);
          }
        }}
        title={deleteTarget ? `Delete user #${deleteTarget.id}` : "Delete user"}
        size="sm"
      >
        <form className="space-y-4" onSubmit={handleDeleteSubmit}>
          {deleteTarget ? (
            <div className="space-y-2 text-sm text-gray-700">
              <p className="font-medium text-gray-900">{formatUserSummary(deleteTarget)}</p>
              <p>
                Deleting this user does not delete orders or tracking histories. It only removes
                the user link from existing records.
              </p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={deleteUser.isPending}>
              Delete
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={bulkDeleteOpen}
        onClose={() => {
          if (!bulkDeleteUsers.isPending) {
            setBulkDeleteOpen(false);
            setBulkDeleteInput("");
          }
        }}
        title="Delete users by IDs"
        size="md"
      >
        <form className="space-y-4" onSubmit={handleBulkDeleteSubmit}>
          <div>
            <label htmlFor="bulk-delete-user-ids" className="mb-1 block text-sm font-medium text-gray-700">
              User IDs / Telegram User IDs
            </label>
            <textarea
              id="bulk-delete-user-ids"
              value={bulkDeleteInput}
              onChange={(event) => setBulkDeleteInput(event.target.value)}
              rows={6}
              placeholder="11, 8999690536"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2 text-sm">
            {bulkDeletePreview.userIds.length > 0 ? (
              <p className="text-gray-700">
                {bulkDeletePreview.userIds.length} IDs selected: {bulkDeletePreview.userIds.join(", ")}
              </p>
            ) : (
              <p className="text-gray-500">No IDs selected</p>
            )}
            {bulkDeletePreview.invalidTokens.length > 0 ? (
              <p className="text-red-600">
                Invalid tokens: {bulkDeletePreview.invalidTokens.join(", ")}
              </p>
            ) : null}
            <p className="text-gray-500">
              You can paste either the User ID column or the Telegram User ID column. Existing
              orders and tracking histories will be kept.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setBulkDeleteOpen(false);
                setBulkDeleteInput("");
              }}
              disabled={bulkDeleteUsers.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={bulkDeleteUsers.isPending}
              disabled={bulkDeletePreview.invalidTokens.length > 0}
            >
              Delete users
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={clearZeroOrderOpen}
        onClose={() => {
          if (!clearZeroOrderUsers.isPending) {
            setClearZeroOrderOpen(false);
          }
        }}
        title="Clear zero-order users"
        size="md"
      >
        <form className="space-y-4" onSubmit={handleClearZeroOrderSubmit}>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              This will delete users that do not have any tracking orders. Orders, histories,
              and action logs will not be deleted.
            </p>
            <p className="font-medium text-gray-900">
              {zeroOrderPreview.isLoading
                ? "Loading preview..."
                : `${zeroOrderUsersCount} user${zeroOrderUsersCount === 1 ? "" : "s"} will be deleted.`}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setClearZeroOrderOpen(false)}
              disabled={clearZeroOrderUsers.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={clearZeroOrderUsers.isPending}
              disabled={
                zeroOrderPreview.isLoading ||
                zeroOrderPreview.isError ||
                zeroOrderUsersCount === 0
              }
            >
              Clear users
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
