import type { Request } from 'express';
import { logger } from '../config/logger.js';

/** Optional host hook for work that continues after the HTTP response. */
export type BackgroundWorkTracker = (work: Promise<void>) => void;

export function backgroundTracker(req: Request): BackgroundWorkTracker | undefined {
  const keepAlive: unknown = req.app.locals.keepBackgroundWorkAlive;
  if (typeof keepAlive !== 'function') return undefined;
  return (work) => {
    try {
      (keepAlive as BackgroundWorkTracker)(work);
    } catch (err) {
      // Work is still bounded and runs locally even if the host hook fails.
      logger.warn({ err }, 'Could not register background work with the host');
    }
  };
}
