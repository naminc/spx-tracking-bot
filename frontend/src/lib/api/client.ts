const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type ApiResponse<T> = {
  success: true;
  message: string;
  data?: T;
};
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
export type PaginatedResult<T> = {
  data: T[];
  meta: PaginationMeta;
};
type ApiPaginatedResponse<T> = {
  success: true;
  message: string;
  data: T[];
  meta: PaginationMeta;
};
type ApiError = {
  success: false;
  message?: string;
  errors?: unknown;
};

export class ApiClientError extends Error {
  code: string;
  status: number;
  reason?: string;
  constructor(message: string, code: string, status: number, reason?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.reason = reason;
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new ApiClientError(
      "Missing VITE_API_BASE_URL. See frontend/.env.example for local and production API URL examples.",
      "MISSING_API_BASE_URL",
      0,
    );
  }

  return API_BASE_URL;
}

function getNetworkErrorMessage(): string {
  if (typeof window === "undefined") {
    return "Failed to connect to API. Please check the backend and VITE_API_BASE_URL.";
  }

  const apiUrl = new URL(getApiBaseUrl(), window.location.origin);
  const pageHost = window.location.hostname;
  const apiHost = apiUrl.hostname;
  const localhostHosts = ["localhost", "127.0.0.1", "::1"];

  if (localhostHosts.includes(apiHost) && !localhostHosts.includes(pageHost)) {
    return "Failed to connect to API. VITE_API_BASE_URL is pointing to localhost; you are on a different host. Please use the LAN IP of the backend or an HTTPS domain.";
  }

  return "Failed to connect to API. Please check the backend, VITE_API_BASE_URL, CORS, and HTTPS settings.";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  const url = joinUrl(getApiBaseUrl(), path);

  try {
    res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
  } catch {
    throw new ApiClientError(getNetworkErrorMessage(), "NETWORK_ERROR", 0);
  }

  const text = await res.text();
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiClientError(
        "API returned invalid JSON. Please check the backend response.",
        "INVALID_JSON",
        res.status
      );
    }
  }

  if (!res.ok) {
    const err = json as ApiError;
    const reason =
      typeof err.errors === "string"
        ? err.errors
        : err.errors
          ? JSON.stringify(err.errors)
          : undefined;

    throw new ApiClientError(
      err.message || "Unknown error",
      "API_ERROR",
      res.status,
      reason
    );
  }

  return (json as ApiResponse<T>).data as T;
}

async function paginatedRequest<T>(path: string, options?: RequestInit): Promise<PaginatedResult<T>> {
  let res: Response;
  const url = joinUrl(getApiBaseUrl(), path);

  try {
    res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
  } catch {
    throw new ApiClientError(getNetworkErrorMessage(), "NETWORK_ERROR", 0);
  }

  const text = await res.text();
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiClientError(
        "API returned invalid JSON. Please check the backend response.",
        "INVALID_JSON",
        res.status
      );
    }
  }

  if (!res.ok) {
    const err = json as ApiError;
    const reason =
      typeof err.errors === "string"
        ? err.errors
        : err.errors
          ? JSON.stringify(err.errors)
          : undefined;

    throw new ApiClientError(
      err.message || "Unknown error",
      "API_ERROR",
      res.status,
      reason
    );
  }

  const result = json as ApiPaginatedResponse<T>;
  return {
    data: result.data,
    meta: result.meta,
  };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  getPaginated: <T>(path: string) => paginatedRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
