/**
 * Application error system.
 *
 * Services throw typed, *operational* AppErrors. The API layer maps them to
 * consistent JSON responses; unexpected errors become a generic 500 and are
 * logged with full detail server-side. Stack traces and internal details are
 * never sent to clients.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input", details?: unknown) {
    super(422, "VALIDATION_ERROR", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}

export class RateLimitError extends AppError {
  constructor(public readonly retryAfterSeconds: number) {
    super(429, "RATE_LIMITED", `Too many requests. Try again in ${retryAfterSeconds}s.`);
  }
}

export class NotImplementedYetError extends AppError {
  constructor(feature: string) {
    super(501, "NOT_IMPLEMENTED", `${feature} is not available in this phase.`);
  }
}

/** Map an unknown thrown value to an AppError (unexpected → 500). */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const e = err as Error;
  return new AppError(500, "INTERNAL", e?.message ?? "Something went wrong.");
}
