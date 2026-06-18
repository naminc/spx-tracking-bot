import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api/client";
import type { Deposit, PaginatedResponse } from "../lib/types";

export function useDeposits(page: number, status: string, pageSize = 20) {
  return useQuery<PaginatedResponse<Deposit>>({
    queryKey: ["deposits", page, status],
    queryFn: () => api.get(`/deposits?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ""}`),
  });
}

export function useDepositDetail(id: string | null) {
  return useQuery<Deposit>({
    queryKey: ["deposits", id],
    queryFn: () => api.get(`/deposits/${id}`),
    enabled: !!id,
  });
}

export function useConfirmDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (depositId: string) => api.patch(`/deposits/${depositId}/confirm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("Deposit confirmed successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (depositId: string) => api.patch(`/deposits/${depositId}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("Deposit cancelled");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
