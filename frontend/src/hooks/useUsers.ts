import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api/client";
import type { User } from "../lib/types/user";

export type UserProfileFilter = "HAS_PROFILE" | "MISSING_PROFILE";

export type UserFilters = {
  q?: string;
  profile?: UserProfileFilter | "";
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

export function useUsers(filters: UserFilters = {}) {
  return useQuery<User[]>({
    queryKey: ["users", filters],
    queryFn: () =>
      apiClient.get(
        `/admin/users${toQueryString({
          q: filters.q?.trim(),
          profile: filters.profile,
        })}`,
      ),
  });
}
