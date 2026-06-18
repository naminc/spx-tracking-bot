import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api/client";

export interface ShopSettings {
  id: number;
  shopName: string;
  shopTitle: string;
  shopChannelUrl: string | null;
  shopWelcomeText: string;
  shopSupportText: string;
  shopStartCta: string;
  supportContact: string;
  adminContact: string | null;
  bankName: string;
  bankBin: string;
  bankAccountNumber: string;
  bankAccountName: string;
  vietqrTemplate: string;
  depositMinAmount: number;
  depositMaxAmount: number;
  depositDescription: string;
  depositPrefix: string;
  depositExpireMinutes: number;
  broadcastBatchSize: number;
  broadcastDelayMs: number;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  updatedAt: string;
}

export function useSettings() {
  return useQuery<ShopSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get<ShopSettings>("/settings")
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ShopSettings>) =>
      api.patch<ShopSettings>("/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message)
  });
}
