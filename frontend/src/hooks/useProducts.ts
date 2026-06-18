import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api/client";
import type { Product, PaginatedResponse } from "../lib/types";

export function useProducts(page: number, pageSize = 10) {
  return useQuery<PaginatedResponse<Product>>({
    queryKey: ["products", page, pageSize],
    queryFn: () => api.get(`/products?page=${page}&pageSize=${pageSize}`),
  });
}

export function useAllProducts() {
  return useQuery<PaginatedResponse<Product>>({
    queryKey: ["products", "all"],
    queryFn: () => api.get("/products?page=1&pageSize=999"),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/products", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown>) => api.patch(`/products/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Product) => api.patch(`/products/${p.id}`, { isActive: !p.isActive }),
    onSuccess: (_data, p) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(p.isActive ? "Product deactivated" : "Product activated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
