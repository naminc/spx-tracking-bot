import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api/client";
import type { User, PaginatedResponse } from "../lib/types";

export function useUsers(page: number, pageSize = 20) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ["users", page],
    queryFn: () => api.get(`/users?page=${page}&pageSize=${pageSize}`),
  });
}

export interface UserDetail extends User {
  orderCount: number;
  depositCount: number;
  walletTxCount: number;
}

export function useUserDetail(id: string | null) {
  return useQuery<UserDetail>({
    queryKey: ["users", id],
    queryFn: () => api.get(`/users/${id}`),
    enabled: !!id,
  });
}

export interface UserOrder {
  id: string;
  orderCode: string;
  productName: string;
  price: number;
  status: string;
  createdAt: string;
}

export function useUserOrders(userId: string, page: number) {
  return useQuery<PaginatedResponse<UserOrder>>({
    queryKey: ["users", userId, "orders", page],
    queryFn: () => api.get(`/users/${userId}/orders?page=${page}&pageSize=10`),
  });
}

export interface UserDeposit {
  id: string;
  code: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

export function useUserDeposits(userId: string, page: number) {
  return useQuery<PaginatedResponse<UserDeposit>>({
    queryKey: ["users", userId, "deposits", page],
    queryFn: () => api.get(`/users/${userId}/deposits?page=${page}&pageSize=10`),
  });
}

export interface WalletTx {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
}

export function useUserWallet(userId: string, page: number) {
  return useQuery<PaginatedResponse<WalletTx>>({
    queryKey: ["users", userId, "wallet", page],
    queryFn: () => api.get(`/users/${userId}/wallet?page=${page}&pageSize=10`),
  });
}

export function useToggleBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.patch<User>(`/users/${userId}/block`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(data.isBlocked ? "User blocked" : "User unblocked");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAdjustBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, direction, amount, note }: {
      userId: string;
      direction: "add" | "sub";
      amount: number;
      note?: string;
    }) => api.post(`/users/${userId}/balance-adjust`, { direction, amount, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Balance adjusted successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
