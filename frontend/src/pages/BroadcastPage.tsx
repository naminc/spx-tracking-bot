import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  useBroadcastDetail,
  useBroadcasts,
  useCreateBroadcast,
  useExportFailedBroadcastRecipients,
  useSendBroadcast,
} from "../hooks/useBroadcast";
import { useBroadcastUserOptions } from "../hooks/useUsers";
import { formatDate } from "../lib/format";
import type {
  Broadcast,
  BroadcastDetail,
  BroadcastRecipient,
  BroadcastTargetType,
} from "../lib/types/broadcast";
import type { User } from "../lib/types/user";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PaginatedTable } from "../components/ui/PaginatedTable";

const maxMessageLength = 4096;

function optionalDate(value: string | null | undefined) {
  return value ? formatDate(value) : "-";
}

function formatUser(user: User | null | undefined) {
  if (!user) return "-";

  if (user.username) return `@${user.username}`;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (fullName) return fullName;

  return `#${user.id}`;
}

function canSendBroadcast(broadcast: Broadcast | BroadcastDetail) {
  return broadcast.status === "DRAFT" || broadcast.status === "FAILED";
}

export function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<BroadcastTargetType>("ALL_USERS");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [sendId, setSendId] = useState<number | null>(null);
  const [sendTarget, setSendTarget] = useState<Broadcast | BroadcastDetail | null>(null);

  const broadcastsQuery = useBroadcasts();
  const userOptionsQuery = useBroadcastUserOptions({
    q: debouncedUserSearch,
    enabled: targetType === "SELECTED_USERS",
    limit: 50,
  });
  const detailQuery = useBroadcastDetail(detailId);
  const createBroadcast = useCreateBroadcast();
  const sendBroadcast = useSendBroadcast();
  const exportFailedRecipients = useExportFailedBroadcastRecipients();

  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const users = useMemo(
    () => userOptionsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [userOptionsQuery.data],
  );
  const totalSelectableUsers = userOptionsQuery.data?.pages[0]?.meta.total ?? 0;
  const broadcasts = broadcastsQuery.data ?? [];
  const userOptionsErrorMessage = userOptionsQuery.error
    ? (userOptionsQuery.error as Error).message
    : "";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedUserSearch(userSearch.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [userSearch]);

  useEffect(() => {
    if (targetType === "SELECTED_USERS" && userOptionsErrorMessage) {
      toast.error(userOptionsErrorMessage, { id: "broadcast-user-options-error" });
    }
  }, [targetType, userOptionsErrorMessage]);

  const handleToggleUser = (userId: number) => {
    setSelectedUserIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((id) => id !== userId)
        : [...currentIds, userId],
    );
  };

  const handleSelectLoadedUsers = () => {
    setSelectedUserIds((currentIds) => [
      ...new Set([...currentIds, ...users.map((user) => user.id)]),
    ]);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedMessage = message.trim();
    const trimmedTitle = title.trim();

    if (!trimmedMessage) {
      toast.error("Please enter a message");
      return;
    }

    if (targetType === "SELECTED_USERS" && selectedUserIds.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    try {
      const broadcast = await createBroadcast.mutateAsync({
        title: trimmedTitle || undefined,
        message: trimmedMessage,
        parseMode: "HTML",
        targetType,
        userIds: targetType === "SELECTED_USERS" ? selectedUserIds : undefined,
      });

      setTitle("");
      setMessage("");
      setSelectedUserIds([]);
      setUserSearch("");
      setDebouncedUserSearch("");
      setTargetType("ALL_USERS");
      setDetailId(broadcast.id);
    } catch {
      // Toast is handled in the mutation.
    }
  };

  const handleSend = async () => {
    if (!sendId) return;

    try {
      await sendBroadcast.mutateAsync(sendId);
      setSendId(null);
      setSendTarget(null);
    } catch {
      // Toast is handled in the mutation.
    }
  };

  const handleExportFailed = async (
    id: number,
    format: "txt" | "csv",
    reason: "all" | "unreachable" = "all",
  ) => {
    try {
      await exportFailedRecipients.mutateAsync({ id, format, reason });
    } catch {
      // Toast is handled in the mutation.
    }
  };

  const openSendConfirm = (broadcast: Broadcast | BroadcastDetail) => {
    setSendTarget(broadcast);
    setSendId(broadcast.id);
  };

  const closeSendConfirm = () => {
    setSendId(null);
    setSendTarget(null);
  };

  const broadcastColumns = [
    {
      key: "title",
      header: "Title",
      render: (broadcast: Broadcast) => broadcast.title || "-",
      className: "whitespace-normal min-w-48",
    },
    {
      key: "status",
      header: "Status",
      render: (broadcast: Broadcast) => <Badge status={broadcast.status} />,
    },
    {
      key: "targetType",
      header: "Target",
      render: (broadcast: Broadcast) => broadcast.targetType,
    },
    {
      key: "total",
      header: "Total",
      render: (broadcast: Broadcast) => broadcast.totalCount,
    },
    {
      key: "sent",
      header: "Sent",
      render: (broadcast: Broadcast) => broadcast.sentCount,
    },
    {
      key: "failed",
      header: "Failed",
      render: (broadcast: Broadcast) => (
        <span className={broadcast.failedCount > 0 ? "font-medium text-red-600" : ""}>
          {broadcast.failedCount}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (broadcast: Broadcast) => formatDate(broadcast.createdAt),
    },
    {
      key: "sentAt",
      header: "Sent At",
      render: (broadcast: Broadcast) => optionalDate(broadcast.sentAt),
    },
    {
      key: "actions",
      header: "",
      render: (broadcast: Broadcast) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setDetailId(broadcast.id);
            }}
          >
            Detail
          </Button>
          {canSendBroadcast(broadcast) && (
            <Button
              type="button"
              size="sm"
              loading={sendBroadcast.isPending && sendId === broadcast.id}
              onClick={(event) => {
                event.stopPropagation();
                openSendConfirm(broadcast);
              }}
            >
              Send
            </Button>
          )}
        </div>
      ),
      className: "text-right",
    },
  ];

  const recipientColumns = [
    {
      key: "telegramUserId",
      header: "Telegram User ID",
      render: (recipient: BroadcastRecipient) => (
        <span className="font-mono text-xs">{recipient.telegramUserId}</span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (recipient: BroadcastRecipient) => formatUser(recipient.user),
    },
    {
      key: "status",
      header: "Status",
      render: (recipient: BroadcastRecipient) => <Badge status={recipient.status} />,
    },
    {
      key: "error",
      header: "Error",
      render: (recipient: BroadcastRecipient) => recipient.errorMessage || "-",
      className: "whitespace-normal min-w-64",
    },
    {
      key: "sentAt",
      header: "Sent At",
      render: (recipient: BroadcastRecipient) => optionalDate(recipient.sentAt),
    },
  ];

  if (broadcastsQuery.error) {
    return (
      <ErrorState
        message={(broadcastsQuery.error as Error).message}
        onRetry={() => {
          broadcastsQuery.refetch();
        }}
      />
    );
  }

  const detail = detailQuery.data;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Broadcasts</h1>

      <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            <Input
              label="Title"
              placeholder="System Notification"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={255}
            />
            <div>
              <label htmlFor="broadcast-message" className="mb-1 block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="broadcast-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                maxLength={maxMessageLength}
                placeholder="Enter the message..."
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <div className="mt-1 flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  HTML supported: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;code&gt;code&lt;/code&gt;, &lt;a href=&quot;https://example.com&quot;&gt;link&lt;/a&gt;
                </span>
                <span className="text-right">
                  {message.length}/{maxMessageLength}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Target</label>
              <div className="space-y-2 rounded-lg border border-gray-200 p-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="targetType"
                    value="ALL_USERS"
                    checked={targetType === "ALL_USERS"}
                    onChange={() => setTargetType("ALL_USERS")}
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  All users
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="targetType"
                    value="SELECTED_USERS"
                    checked={targetType === "SELECTED_USERS"}
                    onChange={() => setTargetType("SELECTED_USERS")}
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Selected users
                </label>
              </div>
            </div>

            {targetType === "ALL_USERS" ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                This broadcast will be sent to all active Telegram users. Blocked users are skipped.
              </div>
            ) : (
              <div>
                <Input
                  label="Search users"
                  placeholder="Telegram ID, username, name..."
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                />

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {selectedUserIds.length} selected
                    {totalSelectableUsers > 0 ? ` | ${totalSelectableUsers} match${totalSelectableUsers === 1 ? "" : "es"}` : ""}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
                      disabled={users.length === 0}
                      onClick={handleSelectLoadedUsers}
                    >
                      Select loaded
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                      disabled={selectedUserIds.length === 0}
                      onClick={() => setSelectedUserIds([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-2 max-h-52 space-y-2 overflow-auto rounded-lg border border-gray-200 p-3 text-sm">
                  {userOptionsQuery.isLoading ? (
                    <div className="py-4 text-center text-sm text-gray-500">Loading users...</div>
                  ) : users.length > 0 ? (
                    users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedUserIdSet.has(user.id)}
                          onChange={() => handleToggleUser(user.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {formatUser(user)} | <span className="font-mono text-xs">{user.telegramUserId}</span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-gray-500">No active users found</div>
                  )}
                </div>

                {userOptionsQuery.hasNextPage ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2 w-full"
                    loading={userOptionsQuery.isFetchingNextPage}
                    onClick={() => userOptionsQuery.fetchNextPage()}
                  >
                    Load more
                  </Button>
                ) : null}
              </div>
            )}

            <Button type="submit" loading={createBroadcast.isPending} className="w-full">
              Create Draft
            </Button>
          </div>
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {broadcastsQuery.isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading broadcasts...</div>
        ) : broadcasts.length > 0 ? (
          <PaginatedTable
            columns={broadcastColumns}
            data={broadcasts}
            keyExtractor={(broadcast) => String(broadcast.id)}
            onRowClick={(broadcast) => setDetailId(broadcast.id)}
            initialPageSize={10}
          />
        ) : (
          <EmptyState message="No broadcasts yet" />
        )}
      </div>

      <Modal open={Boolean(sendId)} onClose={closeSendConfirm} title="Send Broadcast" size="sm">
        <div className="space-y-4 text-sm">
          <p className="text-gray-600">
            Send this broadcast to {sendTarget?.totalCount ?? 0} recipient(s)?
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeSendConfirm}>
              Cancel
            </Button>
            <Button type="button" loading={sendBroadcast.isPending} onClick={handleSend}>
              Send
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title="Broadcast Detail" size="lg">
        {detailQuery.isLoading && <div className="py-8 text-center text-sm text-gray-500">Loading...</div>}
        {detailQuery.error && (
          <ErrorState message={(detailQuery.error as Error).message} onRetry={() => detailQuery.refetch()} />
        )}
        {detail && (
          <div className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Title</dt>
                <dd className="text-gray-900">{detail.title || "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd><Badge status={detail.status} /></dd>
              </div>
              <div>
                <dt className="text-gray-500">Target</dt>
                <dd className="text-gray-900">{detail.targetType}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Recipients</dt>
                <dd className="text-gray-900">
                  {detail.sentCount}/{detail.totalCount} sent | {detail.failedCount} failed
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">{formatDate(detail.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Sent At</dt>
                <dd className="text-gray-900">{optionalDate(detail.sentAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Message</dt>
                <dd className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-gray-900">
                  {detail.message}
                </dd>
              </div>
            </dl>

            {detail.failedCount > 0 ? (
              <div className="flex flex-col gap-3 rounded-lg border border-red-100 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-red-900">Failed recipients</h3>
                  <p className="text-xs text-red-700">
                    Export Telegram IDs to review or paste into Delete by IDs.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={exportFailedRecipients.isPending}
                    onClick={() => handleExportFailed(detail.id, "txt")}
                  >
                    Export failed TXT
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={exportFailedRecipients.isPending}
                    onClick={() => handleExportFailed(detail.id, "csv")}
                  >
                    Export failed CSV
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={exportFailedRecipients.isPending}
                    onClick={() => handleExportFailed(detail.id, "txt", "unreachable")}
                  >
                    Export unreachable TXT
                  </Button>
                </div>
              </div>
            ) : null}

            {canSendBroadcast(detail) && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    setDetailId(null);
                    openSendConfirm(detail);
                  }}
                >
                  Send Broadcast
                </Button>
              </div>
            )}

            <div className="rounded-lg border border-gray-200">
              <PaginatedTable
                columns={recipientColumns}
                data={detail.recipients}
                keyExtractor={(recipient) => String(recipient.id)}
                initialPageSize={10}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
