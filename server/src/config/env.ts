import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// Tiny .env loader (no extra dependency). Values already in the environment win.
function loadDotEnv(file = '.env'): void {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    process.env[key] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnv();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  JWT_SECRET: z.string().min(16).default('dev-only-insecure-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ADMIN_EMAIL: z.string().default('admin@fetchly.local'),
  ADMIN_PASSWORD: z.string().default('change-me-strong-password'),

  DOWNLOAD_DIR: z.string().default('./storage/downloads'),
  TEMP_DIR: z.string().default('./storage/temp'),
  DOWNLOAD_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(30),
  TEMP_FILE_RETENTION_MINUTES: z.coerce.number().int().positive().default(60),
  MAX_DOWNLOAD_SIZE_MB: z.coerce.number().int().positive().default(2048),
  MAX_CONCURRENT_JOBS_PER_IP: z.coerce.number().int().positive().default(3),
  MIN_FREE_DISK_MB: z.coerce.number().int().nonnegative().default(1024),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  ANALYZE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
  LOGIN_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),

  FFMPEG_PATH: z.string().optional(),
  YTDLP_PATH: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
