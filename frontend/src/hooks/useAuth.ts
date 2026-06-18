import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "../lib/api/client";
import type { AdminUser } from "../lib/types/admin-auth";

const SESSION_COOKIE_ERROR_MESSAGE =
  "Login successful but session cookie was not saved. Please ensure that your browser allows cookies and try again.";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AdminUser>({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get<AdminUser>("/admin/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isAuthenticated = !!user && !error;
  const isAuthError = error instanceof ApiClientError && error.status === 401;

  return { user, isLoading, isAuthenticated, isAuthError };
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: (identifier: string) =>
      apiClient.post<{ success: boolean; telegramId: string }>("/admin/auth/request-otp", { identifier }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { telegramId: string; otp: string }) => {
      await apiClient.post<AdminUser>("/admin/auth/verify-otp", data);

      try {
        return await apiClient.get<AdminUser>("/admin/auth/me");
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          throw new ApiClientError(
            SESSION_COOKIE_ERROR_MESSAGE,
            "SESSION_COOKIE_NOT_SAVED",
            401,
            error.reason
          );
        }
        throw error;
      }
    },
    onSuccess: (user) => {
      qc.setQueryData(["auth", "me"], user);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/admin/auth/logout"),
    onSuccess: () => {
      toast.success("Logged out");
      qc.resetQueries({ queryKey: ["auth", "me"] });
      qc.removeQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
