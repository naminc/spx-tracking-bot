import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api/client";
import type { TrackingHistory, TrackingOrder } from "../lib/types/tracking";

type OrderFilters = {
  includeCompleted: boolean;
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: string;
  telegramUserId?: string;
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
      api.get(
        `/orders${toQueryString({
          includeCompleted: filters.includeCompleted,
          trackingNumber: filters.trackingNumber?.trim(),
          telegramChatId: filters.telegramChatId?.trim(),
          userId: filters.userId?.trim(),
          telegramUserId: filters.telegramUserId?.trim(),
        })}`,
      ),
  });
}

export function useCreateTrackingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { trackingNumber: string; telegramChatId?: string }) =>
      api.post<CreateTrackingOrderResult>("/orders", input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tracking-orders"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-histories"] });
      if (result.alreadyExists) {
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
      api.delete<TrackingOrder>(
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
      api.get(
        `/orders/histories${toQueryString({
          trackingNumber: filters.trackingNumber?.trim(),
          telegramChatId: filters.telegramChatId?.trim(),
          userId: filters.userId?.trim(),
          telegramUserId: filters.telegramUserId?.trim(),
          limit: filters.limit ?? 100,
        })}`,
      ),
  });
}
