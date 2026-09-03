import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient, type PaginatedResult } from "../lib/api/client";
import type {
  TrackingOrderActionLog,
  TrackingOrderActionLogFilters,
} from "../lib/types/tracking-action-log";

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

export function useTrackingActionLogs(filters: TrackingOrderActionLogFilters = {}) {
  return useQuery<PaginatedResult<TrackingOrderActionLog>>({
    queryKey: ["tracking-action-logs", filters],
    queryFn: () =>
      apiClient.getPaginated<TrackingOrderActionLog>(
        `/admin/tracking-action-logs${toQueryString({
          carrier: filters.carrier,
          action: filters.action,
          source: filters.source,
          trackingNumber: filters.trackingNumber?.trim(),
          telegramChatId: filters.telegramChatId?.trim(),
          userId: filters.userId?.trim(),
          page: filters.page,
          limit: filters.limit,
          sort: filters.sort,
        })}`,
      ),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}
