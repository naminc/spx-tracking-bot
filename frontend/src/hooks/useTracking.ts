import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "../lib/api/client";
import type { FinalStatus, TrackingHistory, TrackingOrder } from "../lib/types/tracking";

type OrderFilters = {
  includeCompleted: boolean;
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: string;
  telegramUserId?: string;
  finalStatus?: FinalStatus;
};

type HistoryFilters = {
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: string;
  telegramUserId?: string;
  limit?: number;
};

type CreateTrackingOrderResult = {
  order: TrackingOrder;
  alreadyExists: boolean;
  noteUpdated: boolean;
};

function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function useTrackingOrders(filters: OrderFilters) {
  return useQuery<TrackingOrder[]>({
    queryKey: ["tracking-orders", filters],
    queryFn: () =>
      apiClient.get(
        `/orders${toQueryString({
          includeCompleted: filters.includeCompleted,
          trackingNumber: filters.trackingNumber?.trim(),
          telegramChatId: filters.telegramChatId?.trim(),
          userId: filters.userId?.trim(),
          telegramUserId: filters.telegramUserId?.trim(),
          finalStatus: filters.finalStatus,
        })}`,
      ),
  });
}

export function useCreateTrackingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { trackingNumber: string; telegramChatId?: string; note?: string }) =>
      apiClient.post<CreateTrackingOrderResult>("/orders", input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tracking-orders"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-histories"] });
      if (result.alreadyExists) {
        if (result.noteUpdated) {
          toast.warning("Đơn hàng đã tồn tại, đã cập nhật ghi chú");
          return;
        }

        toast.warning("Đơn hàng đã tồn tại trong danh sách theo dõi");
        return;
      }

      toast.success("Đã thêm đơn hàng");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteTrackingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { trackingNumber: string; telegramChatId: string }) =>
      apiClient.delete<TrackingOrder>(
        `/orders/${input.trackingNumber}${toQueryString({ telegramChatId: input.telegramChatId })}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-orders"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-histories"] });
      toast.success("Đã xoá đơn hàng");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useTrackingHistories(filters: HistoryFilters = {}) {
  return useQuery<TrackingHistory[]>({
    queryKey: ["tracking-histories", filters],
    queryFn: () =>
      apiClient.get(
        `/orders/histories${toQueryString({
          trackingNumber: filters.trackingNumber?.trim(),
          telegramChatId: filters.telegramChatId?.trim(),
          userId: filters.userId?.trim(),
          telegramUserId: filters.telegramUserId?.trim(),
          limit: filters.limit,
        })}`,
      ),
  });
}
