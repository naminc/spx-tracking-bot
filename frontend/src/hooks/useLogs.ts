import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api/client";
import type { AdminLog, PaginatedResponse } from "../lib/types";

export interface LogFilters {
  page: number;
  pageSize?: number;
  action?: string;
  adminId?: string;
  targetId?: string;
  q?: string;
  from?: string;
  to?: string;
}

type LogsResponse = PaginatedResponse<AdminLog> & { actions: string[] };

export function useLogs(filters: LogFilters) {
  const { page, pageSize = 20, action, adminId, targetId, q, from, to } = filters;
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (action) params.set("action", action);
  if (adminId) params.set("adminId", adminId);
  if (targetId) params.set("targetId", targetId);
  if (q) params.set("q", q);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  return useQuery<LogsResponse>({
    queryKey: ["logs", page, action, adminId, targetId, q, from, to],
    queryFn: () => api.get(`/logs?${params.toString()}`),
  });
}

export function useLogDetail(id: string | null) {
  return useQuery<AdminLog>({
    queryKey: ["logs", "detail", id],
    queryFn: () => api.get(`/logs/${id}`),
    enabled: !!id,
  });
}

export function useExportLogs() {
  return useMutation({
    mutationFn: (body: { action?: string; adminId?: string; targetId?: string; from?: string; to?: string }) =>
      api.post<{ filename: string; content: string; count: number }>("/logs/export", body),
    onError: (e: Error) => toast.error(e.message),
  });
}
