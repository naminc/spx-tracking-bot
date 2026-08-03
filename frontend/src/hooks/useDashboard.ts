import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api/client";
import type { Dashboard } from "../lib/types/dashboard";

export function useDashboard() {
  return useQuery<Dashboard>({
    queryKey: ["dashboard"],
    queryFn: () => apiClient.get("/admin/dashboard"),
  });
}
