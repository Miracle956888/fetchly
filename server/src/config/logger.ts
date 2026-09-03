import path from 'node:path';
import pino from 'pino';
import { env } from './env.js';

/**
 * Structured JSON logger with file output.
 *  - console (stdout)            : level from LOG_LEVEL
 *  - <LOG_DIR>/server.log        : everything (full audit trail)
 *  - <LOG_DIR>/error.log         : warnings + errors only (what to check first)
 * Sensitive fields are redacted — passwords, tokens and authorization
 * headers must never reach logs or log files.
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
      // Full log file
      {
        target: 'pino/file',
        level: 'trace',
        options: { destination: path.join(logDir, 'server.log'), mkdir: true },
      },
      // Errors & warnings only
      {
        target: 'pino/file',
        level: 'warn',
        options: { destination: path.join(logDir, 'error.log'), mkdir: true },
      },
    ],
  },
});

export type Logger = typeof logger;
