import { useState, useCallback } from "react";
import { toast } from "sonner";
import { formatDate } from "../lib/format";
import { useAllProducts } from "../hooks/useProducts";
import {
  useGlobalStocks,
  useImportStock,
  useDeleteStockItem,
  useExportStocks,
  useRecountStock,
  useRecountAllStocks,
  useDeleteAvailableStock
} from "../hooks/useStocks";
import type { StockItem } from "../hooks/useStocks";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { Badge } from "../components/ui/Badge";
import { Table } from "../components/ui/Table";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function StocksPage() {
  const [productId, setProductId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importProductId, setImportProductId] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<StockItem | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmRecount, setConfirmRecount] = useState(false);

  const { data: products } = useAllProducts();
  const {
    data: stocks,
    isLoading,
    error,
    refetch
  } = useGlobalStocks({
    page,
    productId: productId || undefined,
    status: status || undefined,
    q: search || undefined
  });
  const deleteMut = useDeleteStockItem();
  const exportMut = useExportStocks();
  const importMut = useImportStock(importProductId);
  const recountMut = useRecountStock();
  const recountAllMut = useRecountAllStocks();
  const clearMut = useDeleteAvailableStock(productId);

  const items = stocks?.items ?? [];

  const resetSelection = useCallback(() => setSelected(new Set()), []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      resetSelection();
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  const selectedItems = items.filter((i) => selected.has(i.id));
  const selectedAvailable = selectedItems.filter(
    (i) => i.status === "AVAILABLE"
  );

  const handleCopyItem = (item: StockItem) => {
    navigator.clipboard.writeText(item.content);
    toast.success("Copied to clipboard");
  };

  const handleDownloadItem = (item: StockItem) => {
    downloadText(`stock-${item.id.slice(0, 8)}.txt`, item.content);
  };

  const handleDeleteItem = () => {
    if (!confirmDelete) return;
    deleteMut.mutate(confirmDelete.id, {
      onSuccess: () => {
        setConfirmDelete(null);
        resetSelection();
      }
    });
  };

  const handleBulkDelete = () => {
    const ids = selectedAvailable.map((i) => i.id);
    let done = 0;
    const next = () => {
      if (done >= ids.length) {
        setConfirmBulkDelete(false);
        resetSelection();
        refetch();
        return;
      }
      deleteMut.mutate(ids[done]!, {
        onSuccess: () => {
          done++;
          next();
        },
        onError: () => {
          done++;
          next();
        }
      });
    };
    next();
  };

  const handleExport = (ids?: string[]) => {
    exportMut.mutate(
      { productId: productId || undefined, status: status || undefined, ids },
      {
        onSuccess: (data) => {
          downloadText(data.filename, data.content);
          toast.success(`Exported ${data.count} items`);
        }
      }
    );
  };

  const handleCopySelected = () => {
    const text = selectedItems.map((i) => i.content).join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${selectedItems.length} items`);
  };

  const handleImport = () => {
    if (!importText.trim() || !importProductId) return;
    importMut.mutate(importText, {
      onSuccess: () => {
        setImportText("");
        setImportOpen(false);
      }
    });
  };

  const openImport = () => {
    const pid = productId || products?.items[0]?.id || "";
    setImportProductId(pid);
    setImportOpen(true);
  };

  const handleRecount = () => {
    if (productId) {
      recountMut.mutate(productId, {
        onSuccess: () => setConfirmRecount(false)
      });
      return;
    }

    recountAllMut.mutate(undefined, {
      onSuccess: () => setConfirmRecount(false)
    });
  };

  const handleClearAvailable = () => {
    clearMut.mutate(undefined, { onSuccess: () => setConfirmClear(false) });
  };

  const productOptions = [
    { value: "", label: "All Products" },
    ...(products?.items.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.stockCount})`
    })) ?? [])
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "AVAILABLE", label: "Available" },
    { value: "SOLD", label: "Sold" }
  ];

  const columns = [
    {
      key: "check",
      header: (
        <input
          type="checkbox"
          checked={items.length > 0 && selected.size === items.length}
          onChange={toggleAll}
          className="rounded border-gray-300"
        />
      ) as unknown as string,
      render: (s: StockItem) => (
        <input
          type="checkbox"
          checked={selected.has(s.id)}
          onChange={() => toggleSelect(s.id)}
          className="rounded border-gray-300"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      className: "w-10"
    },
    {
      key: "product",
      header: "Product",
      render: (s: StockItem) => <span className="text-sm">{s.productName}</span>
    },
    {
      key: "content",
      header: "Content",
      render: (s: StockItem) => (
        <span
          className="font-mono text-xs truncate block max-w-xs"
          title={s.content}
        >
          {s.content}
        </span>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (s: StockItem) => <Badge status={s.status} />
    },
    {
      key: "date",
      header: "Created",
      render: (s: StockItem) => (
        <span className="text-gray-500 text-xs">{formatDate(s.createdAt)}</span>
      )
    },
    {
      key: "actions",
      header: "Actions",
      render: (s: StockItem) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleCopyItem(s)}
            className="text-xs text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5 rounded hover:bg-indigo-50"
          >
            Copy
          </button>
          <button
            onClick={() => handleDownloadItem(s)}
            className="text-xs text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5 rounded hover:bg-indigo-50"
          >
            DL
          </button>
          {s.status === "AVAILABLE" ? (
            <button
              onClick={() => setConfirmDelete(s)}
              className="text-xs text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-50"
            >
              Del
            </button>
          ) : (
            <span
              className="text-xs text-gray-400 px-1.5 py-0.5 cursor-not-allowed"
              title="Cannot delete sold items"
            >
              Del
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={openImport}>
            Import
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmRecount(true)}
            title={
              productId
                ? "Recount stock for selected product"
                : "Recount stock for every product"
            }
          >
            {productId ? "Recount Product" : "Recount All"}
          </Button>
          {productId && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => setConfirmClear(true)}
            >
              Clear Available
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select
          options={productOptions}
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setPage(1);
            resetSelection();
          }}
        />
        <Select
          options={statusOptions}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
            resetSelection();
          }}
        />
        <Input
          placeholder="Search content..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            resetSelection();
          }}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            disabled={exportMut.isPending}
            onClick={() => handleExport()}
          >
            Export Filter
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-indigo-700 font-medium">
            {selected.size} items selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleCopySelected}>
              Copy
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleExport([...selected])}
            >
              Export
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const text = selectedItems.map((i) => i.content).join("\n");
                downloadText(`stock-selected-${Date.now()}.txt`, text);
              }}
            >
              Download
            </Button>
            {selectedAvailable.length > 0 && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => setConfirmBulkDelete(true)}
              >
                Delete ({selectedAvailable.length})
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={resetSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {isLoading ? null : error ? (
          <ErrorState
            message={(error as Error).message}
            onRetry={() => refetch()}
          />
        ) : items.length > 0 ? (
          <>
            <Table columns={columns} data={items} keyExtractor={(s) => s.id} />
            <Pagination
              page={page}
              totalPages={stocks?.totalPages ?? 1}
              onPageChange={(p) => {
                setPage(p);
                resetSelection();
              }}
            />
          </>
        ) : (
          <EmptyState message="No stock items found" />
        )}
      </div>

      {/* Import Modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Stock"
      >
        <div className="space-y-3">
          <Select
            label="Product"
            options={[
              { value: "", label: "-- Select Product --" },
              ...(products?.items.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.stockCount})`
              })) ?? [])
            ]}
            value={importProductId}
            onChange={(e) => setImportProductId(e.target.value)}
          />
          <Textarea
            label="Items (one per line)"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            placeholder={"item1\nitem2\nitem3"}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={importMut.isPending}
              onClick={handleImport}
              disabled={!importText.trim() || !importProductId}
            >
              Import ({importText.split("\n").filter((s) => s.trim()).length}{" "}
              items)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete single item */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Stock Item"
        size="sm"
      >
        {confirmDelete && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Delete this AVAILABLE item from{" "}
              <strong>{confirmDelete.productName}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleteMut.isPending}
                onClick={handleDeleteItem}
              >
                Delete
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Bulk delete */}
      <Modal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title="Delete Selected Items"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-1">
          Delete <strong>{selectedAvailable.length}</strong> AVAILABLE items?
        </p>
        {selectedItems.length !== selectedAvailable.length && (
          <p className="text-xs text-amber-600 mb-3">
            {selectedItems.length - selectedAvailable.length} SOLD items will be
            skipped.
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="secondary"
            onClick={() => setConfirmBulkDelete(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteMut.isPending}
            onClick={handleBulkDelete}
          >
            Delete {selectedAvailable.length} Items
          </Button>
        </div>
      </Modal>

      {/* Clear available */}
      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear Available Stock"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Delete ALL available items for this product? Sold items will not be
          affected.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={clearMut.isPending}
            onClick={handleClearAvailable}
          >
            Clear All Available
          </Button>
        </div>
      </Modal>

      {/* Recount */}
      <Modal
        open={confirmRecount}
        onClose={() => setConfirmRecount(false)}
        title={productId ? "Recount Product Stock" : "Recount All Products"}
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          {productId
            ? "Recount AVAILABLE items and update stock count for this product?"
            : "This will recount AVAILABLE items for all products and update stock counts. Continue?"}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmRecount(false)}>
            Cancel
          </Button>
          <Button
            loading={productId ? recountMut.isPending : recountAllMut.isPending}
            onClick={handleRecount}
          >
            {productId ? "Recount Product" : "Recount All"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
