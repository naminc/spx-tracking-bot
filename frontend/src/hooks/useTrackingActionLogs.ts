import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api/client";
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
  return useQuery<TrackingOrderActionLog[]>({
    queryKey: ["tracking-action-logs", filters],
    queryFn: () =>
      apiClient.get(
        `/admin/tracking-action-logs${toQueryString({
          carrier: filters.carrier,
          action: filters.action,
          source: filters.source,
          trackingNumber: filters.trackingNumber?.trim(),
          telegramChatId: filters.telegramChatId?.trim(),
          userId: filters.userId?.trim(),
          limit: filters.limit,
        })}`,
      ),
  });
}
