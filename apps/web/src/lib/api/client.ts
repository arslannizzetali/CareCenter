"use client";

import { useAuthStore } from "@/lib/store/auth.store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
let refreshPromise: Promise<string | null> | null = null;

interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: unknown;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ApiErrorDetail[] | undefined;

  constructor(status: number, code: string, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {})
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body ?? {})
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" })
};

export function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

async function request<T>(path: string, init: RequestInit = {}, canRetry = true): Promise<T> {
  const response = await send(path, init);
  if (response.status === 401 && canRetry && shouldAttemptRefresh(path)) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return request<T>(path, init, false);
    }
    useAuthStore.getState().logout();
  }

  return parseResponse<T>(response);
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as
    | ApiEnvelope<T>
    | { success: false; error: { code: string; message: string; details?: ApiErrorDetail[] } };
  if (!response.ok || !payload.success) {
    const errorPayload = payload as {
      success: false;
      error: { code: string; message: string; details?: ApiErrorDetail[] };
    };
    throw new ApiClientError(
      response.status,
      errorPayload.error.code,
      errorPayload.error.message,
      errorPayload.error.details
    );
  }

  return payload.data;
}

function shouldAttemptRefresh(path: string): boolean {
  return !["/auth/login", "/auth/refresh", "/auth/logout"].includes(path);
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
        if (!payload.success) {
          return null;
        }

        useAuthStore.getState().setAccessToken(payload.data.accessToken);
        return payload.data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
