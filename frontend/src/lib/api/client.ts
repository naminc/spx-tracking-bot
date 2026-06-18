const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

type ApiResponse<T> = {
  success: true;
  message: string;
  data?: T;
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

function getNetworkErrorMessage(): string {
  if (typeof window === "undefined") {
    return "Khong ket noi duoc API. Kiem tra backend va cau hinh API.";
  }

  const apiUrl = new URL(BASE_URL, window.location.origin);
  const pageHost = window.location.hostname;
  const apiHost = apiUrl.hostname;
  const localhostHosts = ["localhost", "127.0.0.1", "::1"];

  if (localhostHosts.includes(apiHost) && !localhostHosts.includes(pageHost)) {
    return "Khong ket noi duoc API. Frontend dang tro API ve localhost; tren dien thoai localhost la chinh dien thoai. Hay dung /api qua Vite proxy, IP LAN cua may chay backend hoac domain HTTPS.";
  }

  return "Khong ket noi duoc API. Kiem tra backend, VITE_API_BASE_URL, CORS va HTTPS.";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(joinUrl(BASE_URL, path), {
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
        "API tra ve du lieu khong hop le. Kiem tra proxy/backend response.",
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

export const api = {
  get: <T>(path: string) => request<T>(path),
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
