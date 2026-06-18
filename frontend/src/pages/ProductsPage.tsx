import { useState } from "react";
import type { Product } from "../lib/types";
import { formatVnd } from "../lib/format";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useToggleProduct } from "../hooks/useProducts";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { Table } from "../components/ui/Table";
import { Pagination } from "../components/ui/Pagination";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";

type ProductForm = {
  name: string;
  price: string;
  description: string;
  itemFormat: string;
  note: string;
};

const emptyForm: ProductForm = { name: "", price: "", description: "", itemFormat: "", note: "" };

export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const { data, isLoading, error, refetch } = useProducts(page);
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();
  const toggleMut = useToggleProduct();

  const openCreate = () => { setForm(emptyForm); setModal("create"); };
  const openEdit = (p: Product) => {
    setSelected(p);
    setForm({ name: p.name, price: String(p.price), description: p.description || "", itemFormat: p.itemFormat || "", note: p.note || "" });
    setModal("edit");
  };
  const openDelete = (p: Product) => { setSelected(p); setModal("delete"); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = { name: form.name, price: Number(form.price), description: form.description || null, itemFormat: form.itemFormat || null, note: form.note || null };
    if (modal === "edit" && selected) {
      updateMut.mutate({ id: selected.id, ...body }, { onSuccess: () => setModal(null) });
    } else {
      createMut.mutate(body, { onSuccess: () => setModal(null) });
    }
  };

  const columns = [
    { key: "name", header: "Name", render: (p: Product) => <span className="font-medium">{p.name}</span> },
    { key: "price", header: "Price", render: (p: Product) => formatVnd(p.price) },
    { key: "stock", header: "Stock", render: (p: Product) => <span className={p.stockCount === 0 ? "text-red-600 font-medium" : ""}>{p.stockCount}</span> },
    {
      key: "active", header: "Active", render: (p: Product) => (
        <button onClick={(e) => { e.stopPropagation(); toggleMut.mutate(p); }}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${p.isActive ? "bg-indigo-600" : "bg-gray-300"}`}>
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition transform ${p.isActive ? "translate-x-4.5" : "translate-x-1"}`} />
        </button>
      ),
    },
    {
      key: "actions", header: "", render: (p: Product) => (
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); openDelete(p); }}>Delete</Button>
        </div>
      ),
    },
  ];

  if (isLoading) return null;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Button onClick={openCreate}>Create Product</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {data && data.items.length > 0 ? (
          <>
            <Table columns={columns} data={data.items} keyExtractor={(p) => p.id} />
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState message="No products found" />
        )}
      </div>

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Product" : "Create Product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. VPS Premium 30 Days" />
          <Input label="Price (VND)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required placeholder="e.g. 50000" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description shown to buyers" />
          <Input label="Item Format" value={form.itemFormat} onChange={(e) => setForm({ ...form, itemFormat: e.target.value })} placeholder="e.g. email:password" />
          <Textarea label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Additional note for buyers (optional)" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={createMut.isPending || updateMut.isPending}>
              {modal === "edit" ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Product" size="sm">
        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete <strong>{selected?.name}</strong>? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteMut.isPending} onClick={() => selected && deleteMut.mutate(selected.id, { onSuccess: () => setModal(null) })}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
