import { useEffect, useMemo, useState } from "react";
import { Button } from "./Button";
import { Table, type Column } from "./Table";

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  resetKey?: string | number;
  loading?: boolean;
  emptyMessage?: string;
};

export function PaginatedTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  resetKey,
  loading = false,
  emptyMessage = "No data found",
}: Props<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const startItem = data.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, data.length);

  return (
    <div>
      <Table columns={columns} data={pageData} keyExtractor={keyExtractor} onRowClick={onRowClick} />
      {data.length === 0 && (
        <div className="border-t border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          {loading ? "Loading..." : emptyMessage}
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing {startItem}-{endItem} of {data.length}
          {loading && data.length > 0 ? <span className="ml-2 text-xs text-gray-400">Refreshing...</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            Rows
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
          >
            Previous
          </Button>
          <span className="min-w-16 text-center">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
