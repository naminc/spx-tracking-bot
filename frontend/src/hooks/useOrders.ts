import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api/client";
import type { Order, PaginatedResponse } from "../lib/types";

export function useOrders(page: number, status: string, pageSize = 20) {
  return useQuery<PaginatedResponse<Order>>({
    queryKey: ["orders", page, status],
    queryFn: () => api.get(`/orders?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ""}`),
  });
}

export function useOrderDetail(id: string | null) {
  return useQuery<Order>({
    queryKey: ["orders", id],
    queryFn: () => api.get(`/orders/${id}`),
    enabled: !!id,
  });
}

export function useRefundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => api.patch(`/orders/${orderId}/refund`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order refunded successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
