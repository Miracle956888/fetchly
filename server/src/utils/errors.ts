/**
 * Consistent API error model.
 * Every error returned to clients has the shape:
 * { success: false, error: { code, message } }
 * Raw stack traces are never exposed.
 */
export type ErrorCode =
  | 'INVALID_URL'
  | 'UNSUPPORTED_PLATFORM'
  | 'PLATFORM_DISABLED'
  | 'PRIVATE_CONTENT'
  | 'CONTENT_UNAVAILABLE'
  | 'VIDEO_NOT_FOUND'
  | 'SOURCE_UNAVAILABLE'
  | 'ENGINE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'DOWNLOAD_FAILED'
  | 'PROCESSING_FAILED'
  | 'FFMPEG_FAILED'
  | 'FILE_NOT_FOUND'
  | 'FILE_EXPIRED'
  | 'TIMEOUT'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'JOB_LIMIT_REACHED'
  | 'STORAGE_FULL'
  | 'SERVER_ERROR';

const STATUS_MAP: Record<ErrorCode, number> = {
  INVALID_URL: 400,
  UNSUPPORTED_PLATFORM: 422,
  PLATFORM_DISABLED: 422,
  PRIVATE_CONTENT: 403,
  CONTENT_UNAVAILABLE: 422,
  VIDEO_NOT_FOUND: 404,
  SOURCE_UNAVAILABLE: 502,
  ENGINE_UNAVAILABLE: 503,
  RATE_LIMITED: 429,
  DOWNLOAD_FAILED: 502,
  PROCESSING_FAILED: 500,
  FFMPEG_FAILED: 500,
  FILE_NOT_FOUND: 404,
  FILE_EXPIRED: 410,
  TIMEOUT: 504,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  JOB_LIMIT_REACHED: 429,
  STORAGE_FULL: 507,
  SERVER_ERROR: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_MAP[code] ?? 500;
    this.details = details;
  }

  static badRequest(message: string): ApiError {
    return new ApiError('VALIDATION_ERROR', message);
  }
  static notFound(message = 'Resource not found.'): ApiError {
    return new ApiError('NOT_FOUND', message);
  }
  static unauthorized(message = 'Authentication required.'): ApiError {
    return new ApiError('UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have access to this resource.'): ApiError {
    return new ApiError('FORBIDDEN', message);
  }
}

export function errorBody(code: ErrorCode, message: string): {
  success: false;
  error: { code: ErrorCode; message: string };
} {
  return { success: false, error: { code, message } };
}
