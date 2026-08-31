class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

export function apiOrigin(): string {
  return import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "") ?? "";
}

function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = apiOrigin();
  if (base) return `${base}${p}`;
  return `/api${p}`;
}

export function authHeaders(token: string | null): HeadersInit {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (
    init?.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(apiUrl(path), { ...init, headers });
}

const BACKEND_UNREACHABLE =
  "Cannot reach the API. Set VITE_API_URL (Vercel env in production, or frontend/.env locally).";

function messageFromJsonBody(data: unknown): string | undefined {
  if (data && typeof data === "object" && data !== null && "error" in data) {
    return String((data as { error?: string }).error);
  }
  return undefined;
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      if (!res.ok && (res.status === 502 || res.status === 504)) {
        throw new ApiError(res.status, BACKEND_UNREACHABLE);
      }
      if (!res.ok) {
        throw new ApiError(
          res.status,
          res.statusText || text.slice(0, 200) || "Request failed"
        );
      }
      throw new ApiError(res.status, "Invalid JSON");
    }
  }
  if (!res.ok) {
    let err =
      messageFromJsonBody(data) || res.statusText || "Request failed";
    if (
      (res.status === 502 || res.status === 504) &&
      (!err || err === "Bad Gateway" || err === "Gateway Timeout")
    ) {
      err = BACKEND_UNREACHABLE;
    }
    const code =
      data && typeof data === "object" && data !== null && "code" in data
        ? String((data as { code?: string }).code)
        : undefined;
    throw new ApiError(res.status, err, code);
  }
  return data as T;
}
