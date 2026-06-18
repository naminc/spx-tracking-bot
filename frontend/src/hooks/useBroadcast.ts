import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api/client";
import type { Broadcast, PaginatedResponse } from "../lib/types";

export function useBroadcasts(page: number, enabled: boolean) {
  return useQuery<PaginatedResponse<Broadcast>>({
    queryKey: ["broadcasts", page],
    queryFn: () => api.get(`/broadcasts?page=${page}&pageSize=20`),
    enabled,
    refetchInterval: (query) => {
      const hasRunning = query.state.data?.items.some(
        (b) => b.status === "PENDING" || b.status === "RUNNING"
      );
      return hasRunning ? 3000 : false;
    },
  });
}

export function useBroadcastPreview() {
  return useMutation({
    mutationFn: (targetType: string) =>
      api.post<{ recipientCount: number }>("/broadcasts/preview", {
        targetType,
        message: "preview",
        parseMode: "plain",
      }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBroadcastSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { targetType: string; message: string; parseMode: string; confirm: boolean }) =>
      api.post("/broadcasts/send", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("Broadcast queued successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
