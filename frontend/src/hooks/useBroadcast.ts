import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "../lib/api/client";
import type { Broadcast, BroadcastDetail, CreateBroadcastInput } from "../lib/types/broadcast";

export function useBroadcasts() {
  return useQuery<Broadcast[]>({
    queryKey: ["broadcasts"],
    queryFn: () => apiClient.get("/admin/broadcasts"),
    refetchInterval: (query) =>
      query.state.data?.some((broadcast) => broadcast.status === "SENDING") ? 3000 : false,
  });
}

export function useBroadcastDetail(id: number | null) {
  return useQuery<BroadcastDetail>({
    queryKey: ["broadcast", id],
    queryFn: () => apiClient.get(`/admin/broadcasts/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.status === "SENDING" ? 3000 : false,
  });
}

export function useCreateBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBroadcastInput) =>
      apiClient.post<BroadcastDetail>("/admin/broadcasts", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("Đã tạo broadcast");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useSendBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<BroadcastDetail>(`/admin/broadcasts/${id}/send`),
    onSuccess: (broadcast) => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["broadcast", broadcast.id] });

      if (broadcast.failedCount > 0) {
        toast.warning("Broadcast đã gửi xong nhưng có người nhận lỗi");
        return;
      }

      toast.success("Đã gửi broadcast");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
