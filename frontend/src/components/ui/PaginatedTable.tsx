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
  manualPagination?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
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
  manualPagination = false,
  page: controlledPage,
  pageSize: controlledPageSize,
  total,
  totalPages: controlledTotalPages,
  onPageChange,
  onPageSizeChange,
}: Props<T>) {
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);
  const page = manualPagination ? controlledPage ?? 1 : internalPage;
  const pageSize = manualPagination ? controlledPageSize ?? initialPageSize : internalPageSize;
  const totalItems = manualPagination ? total ?? data.length : data.length;
  const totalPages = Math.max(
    1,
    controlledTotalPages ?? Math.ceil(totalItems / pageSize),
  );

  useEffect(() => {
    if (!manualPagination) {
      setInternalPage(1);
    }
  }, [manualPagination, resetKey]);

  useEffect(() => {
    if (!manualPagination) {
      setInternalPage((currentPage) => Math.min(currentPage, totalPages));
    }
  }, [manualPagination, totalPages]);

  const pageData = useMemo(() => {
    if (manualPagination) {
      return data;
    }

    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, manualPagination, page, pageSize]);

  const startItem = data.length === 0 || totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = manualPagination
    ? Math.min((page - 1) * pageSize + data.length, totalItems)
    : Math.min(page * pageSize, totalItems);

  const changePage = (nextPage: number) => {
    const normalizedPage = Math.min(totalPages, Math.max(1, nextPage));

    if (manualPagination) {
      onPageChange?.(normalizedPage);
      return;
    }

    setInternalPage(normalizedPage);
  };

  const changePageSize = (nextPageSize: number) => {
    if (manualPagination) {
      onPageSizeChange?.(nextPageSize);
      onPageChange?.(1);
      return;
    }

    setInternalPageSize(nextPageSize);
    setInternalPage(1);
  };

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
          Showing {startItem}-{endItem} of {totalItems}
          {loading && data.length > 0 ? <span className="ml-2 text-xs text-gray-400">Refreshing...</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            Rows
            <select
              value={pageSize}
              onChange={(event) => changePageSize(Number(event.target.value))}
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
            onClick={() => changePage(page - 1)}
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
            onClick={() => changePage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
