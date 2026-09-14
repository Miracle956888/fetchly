import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { allowedOrigins } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { originGuard } from './middleware/originGuard.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { requestId } from './middleware/requestId.js';
import { createApiRouter } from './routes/index.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      // Explicit allow-list reflected per request — required because
      // credentials are enabled ('*' is rejected by browsers with cookies).
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '32kb' }));
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url?.startsWith('/api/v1/health') ?? false },
      genReqId: (req) => (req as { requestId?: string }).requestId ?? '',
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    }),
  );

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1', originGuard);
  app.use('/api/v1', createApiRouter());

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
