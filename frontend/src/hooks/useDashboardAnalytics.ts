import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api/client";
import type { DashboardAnalytics, DashboardAnalyticsFilters } from "../lib/types/dashboard-analytics";

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

export function useDashboardAnalytics(filters: DashboardAnalyticsFilters = {}) {
  return useQuery<DashboardAnalytics>({
    queryKey: ["dashboard-analytics", filters.from, filters.to, filters.carrier],
    queryFn: () =>
      apiClient.get<DashboardAnalytics>(
        `/admin/dashboard/analytics${toQueryString({
          from: filters.from,
          to: filters.to,
          carrier: filters.carrier,
        })}`,
      ),
    enabled: filters.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
