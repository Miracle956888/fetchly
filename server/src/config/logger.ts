import path from 'node:path';
import pino from 'pino';
import { env } from './env.js';

/**
 * Structured JSON logger.
 *
 * Destination strategy:
 *  - stdout ALWAYS (12-factor: the platform's log collector owns retention,
 *    rotation and search — containers have an ephemeral filesystem, so file
 *    logs there would grow unbounded and disappear on redeploy anyway).
 *  - <LOG_DIR>/server.log + <LOG_DIR>/error.log ONLY when LOG_DIR is set.
 *    This is the audit trail for long-lived hosts (VPS, cPanel) where a
 *    persistent disk exists.
 *
 * Sensitive fields are redacted — passwords, tokens and authorization
 * headers must never reach logs or log files.
 */

const redact = {
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
};

const base = {
  level: env.LOG_LEVEL,
  base: { service: 'fetchly-api' },
  redact,
  timestamp: pino.stdTimeFunctions.isoTime,
};

const logDir = env.LOG_DIR ? path.resolve(env.LOG_DIR) : null;

export const logger = logDir
  ? pino({
      ...base,
      transport: {
        targets: [
          // Console
          { target: 'pino/file', level: env.LOG_LEVEL, options: { destination: 1 } },
          // Full log file
          {
            target: 'pino/file',
            level: 'trace',
            options: { destination: path.join(logDir, 'server.log'), mkdir: true },
          },
          // Errors & warnings only — what to check first
          {
            target: 'pino/file',
            level: 'warn',
            options: { destination: path.join(logDir, 'error.log'), mkdir: true },
          },
        ],
      },
    })
  : pino(base);

export type Logger = typeof logger;
