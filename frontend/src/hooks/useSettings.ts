import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "../lib/api/client";
import type { AppSetting, UpdateAppSettingInput } from "../lib/types/setting";

export function useSettings() {
  return useQuery<AppSetting>({
    queryKey: ["settings"],
    queryFn: () => apiClient.get("/admin/settings"),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAppSettingInput) =>
      apiClient.put<AppSetting>("/admin/settings", input),
    onSuccess: (settings) => {
      queryClient.setQueryData(["settings"], settings);
      toast.success("Settings updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
