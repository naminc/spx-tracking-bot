import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api/client";
import type { User } from "../lib/types/user";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiClient.get("/admin/users"),
  });
}
