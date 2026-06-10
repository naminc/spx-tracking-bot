export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data?: T;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  errors: unknown;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiPaginatedResponse<T> = {
  success: true;
  message: string;
  data: T[];
  meta: PaginationMeta;
};

export function successResponse<T>(message: string, data?: T): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
  };
}

export function errorResponse(message: string, errors: unknown = null): ApiErrorResponse {
  return {
    success: false,
    message,
    errors,
  };
}

export function paginatedResponse<T>(
  message: string,
  data: T[],
  meta: PaginationMeta,
): ApiPaginatedResponse<T> {
  return {
    success: true,
    message,
    data,
    meta,
  };
}
