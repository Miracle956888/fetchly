import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wrap async handlers so rejections reach the central error handler. */
export function asyncH(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
