import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api/client";
import type { PaginatedResponse } from "../lib/types";

export interface StockItem {
  id: string;
  productId: string;
  productName: string;
  content: string;
  status: "AVAILABLE" | "SOLD";
  createdAt: string;
}

export function useGlobalStocks(params: {
  page: number;
  pageSize?: number;
  productId?: string;
  status?: string;
  q?: string;
}) {
  const { page, pageSize = 20, productId, status, q } = params;
  const search = new URLSearchParams();
  search.set("page", String(page));
  search.set("pageSize", String(pageSize));
  if (productId) search.set("productId", productId);
  if (status) search.set("status", status);
  if (q) search.set("q", q);

  return useQuery<PaginatedResponse<StockItem>>({
    queryKey: ["stocks", page, productId, status, q],
    queryFn: () => api.get(`/stocks?${search.toString()}`)
  });
}

export function useProductStocks(
  productId: string,
  page: number,
  pageSize = 50
) {
  return useQuery<PaginatedResponse<StockItem>>({
    queryKey: ["stocks", productId, page],
    queryFn: () =>
      api.get(
        `/products/${productId}/stocks?page=${page}&pageSize=${pageSize}`
      ),
    enabled: !!productId
  });
}

export function useImportStock(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: string) =>
      api.post<{ importedCount: number }>(
        `/products/${productId}/stocks/import`,
        { items }
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stocks"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Imported ${data.importedCount ?? ""} items`);
    },
    onError: (e: Error) => toast.error(e.message)
  });
}

export function useDeleteStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stockId: string) => api.delete(`/stocks/${stockId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stocks"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock item deleted");
    },
    onError: (e: Error) => toast.error(e.message)
  });
}

export function useExportStocks() {
  return useMutation({
    mutationFn: (body: {
      productId?: string;
      status?: string;
      ids?: string[];
    }) =>
      api.post<{ filename: string; content: string; count: number }>(
        "/stocks/export",
        body
      ),
    onError: (e: Error) => toast.error(e.message)
  });
}

export function useRecountStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      api.post<{ before: number; after: number }>(
        `/products/${productId}/stocks/recount`
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stocks"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Stock recounted: ${data.before} → ${data.after}`);
    },
    onError: (e: Error) => toast.error(e.message)
  });
}

export interface RecountAllStocksResult {
  updatedCount: number;
  unchangedCount: number;
  totalProducts: number;
  changed: Array<{
    productId: string;
    productName: string;
    before: number;
    after: number;
  }>;
}

export function useRecountAllStocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<RecountAllStocksResult>("/products/stocks/recount-all"),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stocks"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (data.updatedCount > 0) {
        toast.success(
          `Recounted all products: ${data.updatedCount} updated, ${data.unchangedCount} unchanged`
        );
      } else {
        toast.success("All product stock counts are already correct");
      }
    },
    onError: (e: Error) => toast.error(e.message)
  });
}

export function useDeleteAvailableStock(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/products/${productId}/stocks/available`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stocks"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Available stock cleared");
    },
    onError: (e: Error) => toast.error(e.message)
  });
}
