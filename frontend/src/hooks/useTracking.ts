import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, type PaginatedResult } from "../lib/api/client";
import type { FinalStatus, TrackingCarrier, TrackingHistory, TrackingOrder } from "../lib/types/tracking";

export type OrderSort = "UPDATED_DESC" | "CREATED_DESC" | "LAST_EVENT_DESC" | "STATUS";
export type HistorySort = "EVENT_DESC" | "EVENT_ASC" | "CREATED_DESC";

type OrderFilters = {
  includeCompleted: boolean;
  carrier?: TrackingCarrier | "";
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: string;
  telegramUserId?: string;
  finalStatus?: FinalStatus;
  page?: number;
  limit?: number;
  sort?: OrderSort;
};

type HistoryFilters = {
  carrier?: TrackingCarrier | "";
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: string;
  telegramUserId?: string;
  limit?: number;
  page?: number;
  sort?: HistorySort;
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
  return useQuery<PaginatedResult<TrackingOrder>>({
    queryKey: ["tracking-orders", filters],
    queryFn: () =>
      apiClient.getPaginated<TrackingOrder>(
        `/orders${toQueryString({
          includeCompleted: filters.includeCompleted,
          carrier: filters.carrier,
          trackingNumber: filters.trackingNumber?.trim(),
          telegramChatId: filters.telegramChatId?.trim(),
          userId: filters.userId?.trim(),
          telegramUserId: filters.telegramUserId?.trim(),
          finalStatus: filters.finalStatus,
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

export function useCreateTrackingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      carrier?: TrackingCarrier | "AUTO";
      trackingNumber: string;
      telegramChatId?: string;
      note?: string;
      trackingCredential?: string;
    }) =>
      apiClient.post<CreateTrackingOrderResult>("/orders", input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tracking-orders"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-histories"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-action-logs"] });
      if (result.alreadyExists) {
        if (result.noteUpdated) {
          toast.warning("Đơn hàng đã tồn tại, đã cập nhật ghi chú");
          return;
        }

        toast.warning("Đơn hàng đã tồn tại trong danh sách theo dõi");
        return;
      }

      toast.success("Tracking order added");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteTrackingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { carrier?: TrackingCarrier | "AUTO"; trackingNumber: string; telegramChatId: string }) =>
      apiClient.delete<TrackingOrder>(
        `/orders/${input.trackingNumber}${toQueryString({
          carrier: input.carrier,
          telegramChatId: input.telegramChatId,
        })}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-orders"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-histories"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-action-logs"] });
      toast.success("Tracking order deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useTrackingHistories(filters: HistoryFilters = {}) {
  return useQuery<PaginatedResult<TrackingHistory>>({
    queryKey: ["tracking-histories", filters],
    queryFn: () =>
      apiClient.getPaginated<TrackingHistory>(
        `/orders/histories${toQueryString({
          carrier: filters.carrier,
          trackingNumber: filters.trackingNumber?.trim(),
          telegramChatId: filters.telegramChatId?.trim(),
          userId: filters.userId?.trim(),
          telegramUserId: filters.telegramUserId?.trim(),
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
