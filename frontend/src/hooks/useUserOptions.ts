import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api/client";
import type { User } from "../lib/types/user";

type UserOptionFilters = {
  search?: string;
  selectedUserId?: string | number;
  limit?: number;
  enabled?: boolean;
};

function toQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function useUserOptions(filters: UserOptionFilters = {}) {
  const normalizedSearch = filters.search?.trim();
  const selectedUserId = filters.selectedUserId ? String(filters.selectedUserId) : undefined;

  return useQuery<User[]>({
    queryKey: ["user-options", normalizedSearch, selectedUserId, filters.limit],
    queryFn: () =>
      apiClient.get<User[]>(
        `/admin/users/options${toQueryString({
          search: normalizedSearch,
          selectedUserId,
          limit: filters.limit,
        })}`,
      ),
    enabled: filters.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
