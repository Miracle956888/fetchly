import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { ApiError, errorBody } from '../utils/errors.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(errorBody('NOT_FOUND', 'This endpoint does not exist.'));
}

/** Central error translator. Raw errors/stack traces never reach clients. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Body-parser failures: malformed JSON or payloads above the size limit.
  const bodyErr = err as { type?: string };
  if (bodyErr.type === 'entity.parse.failed') {
    res.status(400).json(errorBody('VALIDATION_ERROR', 'Request body is not valid JSON.'));
    return;
  }
  if (bodyErr.type === 'entity.too.large') {
    res.status(413).json(errorBody('VALIDATION_ERROR', 'Request payload is too large.'));
    return;
  }

  if (err instanceof ZodError) {
    const first = err.errors[0];
    res
      .status(400)
      .json(errorBody('VALIDATION_ERROR', first?.message ?? 'Invalid request payload.'));
    return;
  }
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      logger.error({ requestId: req.requestId, code: err.code, message: err.message }, 'API error');
    }
    res.status(err.status).json(errorBody(err.code, err.message));
    return;
  }
  logger.error({ requestId: req.requestId, err }, 'Unhandled server error');
  res.status(500).json(errorBody('SERVER_ERROR', 'Something went wrong on our side. Please try again.'));
}
