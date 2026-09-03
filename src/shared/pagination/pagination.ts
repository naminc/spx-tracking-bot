import type { PaginationMeta } from '../response/api-response';

export type PaginationInput = {
  page: number;
  limit: number;
};

export type PaginatedRepositoryResult<T> = PaginationInput & {
  data: T[];
  total: number;
};

export function getPaginationArgs(input: PaginationInput): { skip: number; take: number } {
  return {
    skip: (input.page - 1) * input.limit,
    take: input.limit,
  };
}

export function getPaginationMeta(input: PaginationInput & { total: number }): PaginationMeta {
  return {
    page: input.page,
    limit: input.limit,
    total: input.total,
    totalPages: Math.max(1, Math.ceil(input.total / input.limit)),
  };
}
