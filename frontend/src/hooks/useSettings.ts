import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "../lib/api/client";
import type { AppSetting } from "../lib/types/setting";

export function useSettings() {
  return useQuery<AppSetting>({
    queryKey: ["settings"],
    queryFn: () => apiClient.get("/admin/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { adminContact: string; maintenanceEnabled: boolean }) =>
      apiClient.put<AppSetting>("/admin/settings", input),
    onSuccess: (settings) => {
      queryClient.setQueryData(["settings"], settings);
      toast.success("Đã cập nhật cấu hình");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
