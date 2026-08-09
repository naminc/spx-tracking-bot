import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../lib/api/client";
import type { PublicTrackInput, PublicTrackingResult } from "../lib/types/public-tracking";

export function usePublicTracking() {
  return useMutation({
    mutationFn: (input: PublicTrackInput) =>
      apiClient.post<PublicTrackingResult>("/public/track", input),
  });
}
