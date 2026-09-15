/**
 * API application layer: consistent request handling.
 *
 * Route handlers stay thin — parse + validate input (Zod), call a service,
 * respond with a uniform envelope:
 *   success: { "data": ... }  (optionally { "data": ..., "meta": { pagination } })
 *   error:   { "error": { "code", "message", "details?" } }
 *
 * Status codes: 200/201 success, 400 bad request, 401 unauthenticated,
 * 403 forbidden, 404 not found, 409 conflict, 415 unsupported media type,
 * 422 validation, 429 rate limited, 500 unexpected.
 */
import { NextRequest, NextResponse } from "next/server";
import { AppError, RateLimitError, toAppError } from "@/lib/errors";

export function ok<T>(data: T, init?: { status?: number; meta?: Record<string, unknown> }): NextResponse {
  return NextResponse.json(
    init?.meta ? { data, meta: init.meta } : { data },
    { status: init?.status ?? 200 },
  );
}

export function okList<T>(data: T[], meta: { page: number; perPage: number; total: number; totalPages: number }): NextResponse {
  return NextResponse.json({ data, meta });
}

function errorResponse(err: AppError, request: NextRequest): NextResponse {
  const body: { error: { code: string; message: string; details?: unknown } } = {
    error: { code: err.code, message: err.message },
  };
  if (err.details !== undefined && err instanceof AppError && err.statusCode === 422) {
    body.error.details = err.details;
  }
  const headers: Record<string, string> = {};
  if (err instanceof RateLimitError) {
    headers["Retry-After"] = String(Math.ceil(err.retryAfterSeconds));
  }
  // Log non-operational (unexpected) errors with full context for developers.
  if (err.statusCode === 500) {
    console.error(`[api] ${request.method} ${request.nextUrl.pathname} → 500:`, err);
  } else {
    console.info(`[api] ${request.method} ${request.nextUrl.pathname} → ${err.statusCode} ${err.code}`);
  }
  return NextResponse.json(body, { status: err.statusCode, headers });
}

type Handler = (
  req: NextRequest,
  ctx: ApiContext,
  params: Promise<Record<string, string | string[]>>,
) => Promise<NextResponse>;

export interface ApiContext {
  req: NextRequest;
  /** Best-effort client IP (first X-Forwarded-For hop behind a proxy). */
  clientIp: string;
  userAgent: string | null;
}

/** Wrap a route handler with uniform validation/error handling. */
export function apiHandler(handler: Handler) {
  return async (req: NextRequest, routeCtx: { params: Promise<Record<string, string | string[]>> }): Promise<NextResponse> => {
    const clientIp = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local");
    const ctx: ApiContext = {
      req,
      clientIp,
      userAgent: req.headers.get("user-agent"),
    };
    try {
      return await handler(req, ctx, routeCtx.params);
    } catch (err) {
      return errorResponse(toAppError(err), req);
    }
  };
}

/**
 * Parse a JSON body with a Zod schema. Rejects non-JSON content types (415)
 * and malformed JSON (400) before schema validation (422 on schema failure).
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Request body must be JSON.");
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError(400, "BAD_REQUEST", "Malformed JSON body.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    throw new AppError(422, "VALIDATION_ERROR", "Invalid input.", details);
  }
  return result.data;
}

// Avoid an explicit import cycle with validation (schemas module is isomorphic).
import type { z } from "zod";
