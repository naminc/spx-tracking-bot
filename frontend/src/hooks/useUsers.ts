import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "../lib/api/client";
import type { User } from "../lib/types/user";

export type UserProfileFilter = "HAS_PROFILE" | "MISSING_PROFILE";
export type UserSort = "CREATED_DESC" | "ORDERS_DESC" | "ORDERS_ASC";

export type UserFilters = {
  q?: string;
  profile?: UserProfileFilter | "";
  sort?: UserSort;
};

export type DeleteUsersResult = {
  deletedCount: number;
  deletedUserIds: number[];
  deletedTelegramUserIds?: string[];
  notFoundUserIds?: number[];
};

export type ClearZeroOrderUsersResult = {
  deletedCount: number;
  deletedUserIds: number[];
  deletedTelegramUserIds?: string[];
};

export type ZeroOrderUsersPreview = {
  count: number;
  users: User[];
};

function toQueryString(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function invalidateUserRelatedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["users"] });
  queryClient.invalidateQueries({ queryKey: ["tracking-orders"] });
  queryClient.invalidateQueries({ queryKey: ["tracking-histories"] });
  queryClient.invalidateQueries({ queryKey: ["tracking-action-logs"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery<User[]>({
    queryKey: ["users", filters],
    queryFn: () =>
      apiClient.get(
        `/admin/users${toQueryString({
          q: filters.q?.trim(),
          profile: filters.profile,
          sort: filters.sort,
        })}`,
      ),
  });
}

export function useZeroOrderUsersPreview(enabled: boolean) {
  return useQuery<ZeroOrderUsersPreview>({
    queryKey: ["users", "zero-order-preview"],
    queryFn: () => apiClient.get<ZeroOrderUsersPreview>("/admin/users/zero-order-preview"),
    enabled,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: number; reason?: string | null }) =>
      apiClient.patch<User>(`/admin/users/${input.id}/block`, {
        reason: input.reason?.trim() || undefined,
      }),
    onSuccess: () => {
      invalidateUserRelatedQueries(queryClient);
      toast.success("User blocked");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.patch<User>(`/admin/users/${id}/unblock`, {}),
    onSuccess: () => {
      invalidateUserRelatedQueries(queryClient);
      toast.success("User unblocked");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete<DeleteUsersResult>(`/admin/users/${id}`),
    onSuccess: () => {
      invalidateUserRelatedQueries(queryClient);
      toast.success("User deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useBulkDeleteUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userIds: number[]) =>
      apiClient.post<DeleteUsersResult>("/admin/users/bulk-delete", { userIds }),
    onSuccess: (result) => {
      invalidateUserRelatedQueries(queryClient);

      if (result.deletedCount > 0) {
        toast.success(`${result.deletedCount} user${result.deletedCount === 1 ? "" : "s"} deleted`);
      } else {
        toast.error("No users were deleted");
      }

      if (result.notFoundUserIds?.length) {
        toast.warning(`Not found: ${result.notFoundUserIds.join(", ")}`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useClearZeroOrderUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<ClearZeroOrderUsersResult>("/admin/users/clear-zero-order"),
    onSuccess: (result) => {
      invalidateUserRelatedQueries(queryClient);
      toast.success(`Deleted ${result.deletedCount} zero-order user${result.deletedCount === 1 ? "" : "s"}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
