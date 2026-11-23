import { existsSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { requestId } from './middleware/requestId.js';
import { createApiRouter } from './routes/index.js';

export function createApp(clientDistDir = env.CLIENT_DIST_DIR): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        // Preview thumbnails are hosted by the source platforms/CDNs.
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }));
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '32kb' }));
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      // URLs may contain signed delivery tokens and responses may set admin
      // cookies. Log neither query strings nor headers on the public service.
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: typeof req.url === 'string' ? req.url.split('?')[0] : undefined,
          remoteAddress: req.remoteAddress,
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      autoLogging: { ignore: (req) => req.url?.startsWith('/api/v1/health') ?? false },
      genReqId: (req) => (req as { requestId?: string }).requestId ?? '',
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    }),
  );

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1', createApiRouter());

  // API misses must remain JSON 404s, never the SPA's index.html.
  app.use('/api', notFoundHandler);

  if (clientDistDir) {
    const root = path.resolve(clientDistDir);
    const index = path.join(root, 'index.html');
    if (!existsSync(index)) throw new Error(`Client build not found in ${root}`);
    app.use(express.static(root));
    app.get('*', (req, res, next) => {
      // Missing assets should 404; only browser navigation falls back to React.
      if (path.extname(req.path) || !req.accepts('html')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(index);
    });
  }

  app.use(errorHandler);
  return app;
}
