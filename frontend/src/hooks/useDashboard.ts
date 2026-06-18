import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api/client";
import type { DashboardData } from "../lib/types";

export function useDashboard(range: string, from?: string, to?: string) {
  const params = new URLSearchParams({ range });
  if (range === "custom" && from) params.set("from", from);
  if (range === "custom" && to) params.set("to", to);

  return useQuery<DashboardData>({
    queryKey: ["dashboard", range, from, to],
    queryFn: () => api.get<DashboardData>(`/dashboard?${params.toString()}`),
  });
}
