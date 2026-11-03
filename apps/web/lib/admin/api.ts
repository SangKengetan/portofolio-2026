/**
 * Browser-side client for the admin API (apps/api, `/v1/auth/*` and `/v1/admin/*`).
 *
 * - Session lives in httpOnly cookies set by the API (pf_access 15 min, pf_refresh 7 days),
 *   so every request uses `credentials: "include"` and the page never sees a token.
 * - A 401 triggers ONE shared call to POST /auth/refresh, then the request is retried once.
 *   If refreshing fails the session is over: the registered handler sends the user to /admin/login.
 * - Errors are thrown as AdminApiError with the API's `code`, `message` and per-field messages
 *   (dotted keys, e.g. "blocks.2.data.mediaId").
 */
import type { PaginationMeta } from "@portfolio/shared";

export const ADMIN_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string> = {},
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: PaginationMeta;
  message: string;
  headers: Headers;
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

/* ---------- session expiry hook (set by the AuthProvider) ---------- */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/* ---------- refresh (deduplicated across parallel requests) ---------- */
let refreshing: Promise<boolean> | null = null;
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${ADMIN_API_URL}/v1/auth/refresh`, { method: "POST", credentials: "include" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export function buildQuery(query?: Query) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

const NO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout"];

async function request<T>(path: string, options: RequestOptions = {}, canRetry = true): Promise<ApiResult<T>> {
  if (!ADMIN_API_URL) {
    throw new AdminApiError(0, "API_NOT_CONFIGURED", "NEXT_PUBLIC_API_URL is not set in apps/web/.env.local.");
  }
  const { method = "GET", body, query, signal } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${ADMIN_API_URL}/v1${path}${buildQuery(query)}`, {
      method,
      credentials: "include",
      signal,
      headers: body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    // fetch() fails the same way for "API down" and "blocked by CORS", so name both causes.
    const origin = typeof window !== "undefined" ? window.location.origin : "this site";
    throw new AdminApiError(
      0,
      "NETWORK_ERROR",
      `Cannot reach the API at ${ADMIN_API_URL}. Check that it is running and that WEB_ORIGIN in apps/api/.env includes ${origin}.`,
    );
  }

  if (res.status === 401 && canRetry && !NO_REFRESH.some((p) => path.startsWith(p))) {
    if (await refreshSession()) return request<T>(path, options, false);
    onSessionExpired?.();
  }

  const payload = (await res.json().catch(() => null)) as
    | { data?: T; meta?: PaginationMeta; message?: string; error?: { code: string; message: string; fields?: Record<string, string> }; requestId?: string }
    | null;

  if (!res.ok) {
    const retryAfter = res.headers.get("Retry-After");
    const message =
      payload?.error?.message ??
      payload?.message ??
      (res.status === 429 ? `Too many requests${retryAfter ? ` — try again in ${retryAfter}s` : ""}.` : `Request failed (${res.status}).`);
    throw new AdminApiError(res.status, payload?.error?.code ?? "HTTP_ERROR", message, payload?.error?.fields ?? {}, payload?.requestId);
  }

  return {
    data: (payload?.data ?? null) as T,
    meta: payload?.meta,
    message: payload?.message ?? "OK",
    headers: res.headers,
  };
}

export const adminApi = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T = null>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Human-readable message for any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof AdminApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

/** Field errors (dotted keys) from a 422, or an empty object. */
export function fieldErrors(err: unknown): Record<string, string> {
  return err instanceof AdminApiError ? err.fields : {};
}
