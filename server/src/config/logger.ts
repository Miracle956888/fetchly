import path from 'node:path';
import pino from 'pino';
import { env } from './env.js';

/**
 * Structured JSON logging. Production defaults to stdout so an ephemeral
 * Render instance doesn't accumulate unbounded local log files. Development
 * writes server.log/error.log as well; explicitly setting LOG_DIR opts in to
 * those files in production. Sensitive fields are redacted.
 */

const logDir = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : path.resolve(process.cwd(), 'logs');

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'fetchly-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
      'res.headers["set-cookie"]',
      'req.query.token',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.accessToken',
    ],
    censor: '[redacted]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    targets: [
      // Console, as before
      { target: 'pino/file', level: env.LOG_LEVEL, options: { destination: 1 } },
      ...(env.NODE_ENV !== 'production' || process.env.LOG_DIR
        ? [
            {
              target: 'pino/file',
              level: 'trace',
              options: { destination: path.join(logDir, 'server.log'), mkdir: true },
            },
            {
              target: 'pino/file',
              level: 'warn',
              options: { destination: path.join(logDir, 'error.log'), mkdir: true },
            },
          ]
        : []),
    ],
  },
});

export type Logger = typeof logger;
