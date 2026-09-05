import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "../lib/api/client";
import type { Broadcast, BroadcastDetail, CreateBroadcastInput } from "../lib/types/broadcast";

export type FailedRecipientsExportFormat = "txt" | "csv";
export type FailedRecipientsExportReason =
  | "all"
  | "bot_blocked"
  | "chat_not_found"
  | "deactivated"
  | "telegram_parse_error"
  | "telegram_error"
  | "unreachable";

type FailedRecipientsExportInput = {
  id: number;
  format: FailedRecipientsExportFormat;
  reason?: FailedRecipientsExportReason;
};

function toQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useBroadcasts() {
  return useQuery<Broadcast[]>({
    queryKey: ["broadcasts"],
    queryFn: () => apiClient.get("/admin/broadcasts"),
    refetchInterval: (query) =>
      query.state.data?.some((broadcast) => broadcast.status === "SENDING") ? 3000 : false,
  });
}

export function useBroadcastDetail(id: number | null) {
  return useQuery<BroadcastDetail>({
    queryKey: ["broadcast", id],
    queryFn: () => apiClient.get(`/admin/broadcasts/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.status === "SENDING" ? 3000 : false,
  });
}

export function useCreateBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBroadcastInput) =>
      apiClient.post<BroadcastDetail>("/admin/broadcasts", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("Broadcast draft created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useSendBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<BroadcastDetail>(`/admin/broadcasts/${id}/send`),
    onSuccess: (broadcast) => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["broadcast", broadcast.id] });

      if (broadcast.failedCount > 0) {
        toast.warning("Broadcast finished with failed recipients");
        return;
      }

      toast.success("Broadcast sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useExportFailedBroadcastRecipients() {
  return useMutation({
    mutationFn: async (input: FailedRecipientsExportInput) => {
      const format = input.format;
      const result = await apiClient.download(
        `/admin/broadcasts/${input.id}/failed-recipients/export${toQueryString({
          format,
          reason: input.reason ?? "all",
        })}`,
      );
      const filename = result.filename ?? `broadcast-${input.id}-failed-recipients.${format}`;

      downloadBlob(result.blob, filename);
      return filename;
    },
    onSuccess: () => toast.success("Failed recipients exported"),
    onError: (error: Error) => toast.error(error.message),
  });
}
