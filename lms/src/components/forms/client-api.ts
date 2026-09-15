"use client";

/**
 * Minimal fetch helper for client components.
 * - Always JSON
 * - Unwraps the { data } / { error } envelope
 * - Surfaces 401 as "please log in" and exposes 422 field details
 */

export interface ApiError {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
  status: number;
}

export class ApiRequestError extends Error {
  constructor(public apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiRequestError";
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
}

export async function api<T = unknown>(url: string, opts: ApiOptions = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    credentials: "same-origin",
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let json: { data?: T; error?: { code: string; message: string; details?: { field: string; message: string }[] } };
  try {
    json = await res.json();
  } catch {
    throw new ApiRequestError({
      code: res.status === 401 ? "UNAUTHORIZED" : "BAD_RESPONSE",
      message: res.status === 401 ? "Please log in to continue." : "Unexpected server response.",
      status: res.status,
    });
  }

  if (!res.ok) {
    const err = json.error ?? { code: "UNKNOWN", message: "Something went wrong." };
    throw new ApiRequestError({ ...err, status: res.status });
  }
  return json.data as T;
}

/** Convert an ApiRequestError into per-field errors for forms. */
export function fieldErrors(err: unknown): Record<string, string> | null {
  if (!(err instanceof ApiRequestError)) return null;
  const details = err.apiError.details;
  if (!details?.length) return null;
  const out: Record<string, string> = {};
  for (const d of details) out[d.field] = d.message;
  return out;
}

/** Top-level error message for alerts (with a 429 retry hint). */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiRequestError) return err.apiError.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** 401s anywhere in a form action → send the user to login. */
export function handleApiError(err: unknown): void {
  if (err instanceof ApiRequestError && err.apiError.status === 401) {
    window.location.href = "/login";
  }
}
