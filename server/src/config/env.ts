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

/**
 * Development-only fallbacks. These values are published in this repository,
 * so they are NEVER acceptable in production — `assertProductionSecrets`
 * below refuses to boot if they are still in effect when NODE_ENV=production.
 */
const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me';
const DEV_ADMIN_PASSWORD = 'change-me-strong-password';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  /** When set, pino also writes server.log/error.log here. Containers should leave it unset and log to stdout. */
  LOG_DIR: z.string().optional(),

  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3000'),
  /** Extra allowed CORS origins, comma separated (e.g. a preview URL plus the real domain). */
  CORS_ORIGINS: z.string().optional(),

  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  /**
    // Explicit opt-in to ephemeral persistence/queue in production. Off by
    // default so a missing DATABASE_URL fails the boot instead of silently
    // discarding data on restart.
  */
  ALLOW_EPHEMERAL_STORAGE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Optional at the schema level so we can produce a precise error message
  // (and a safe dev fallback) rather than a generic zod failure.
  JWT_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ADMIN_EMAIL: z.string().default('admin@fetchly.local'),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  /**
   * SameSite for the admin session cookie.
   *  - strict/lax: frontend and API on the same site (Docker/Nginx, cPanel
   *    reverse proxy). This is the recommended topology.
   *  - none: cross-site frontend/API. Requires HTTPS (Secure is forced) and
   *    is subject to browser third-party-cookie blocking — the client's
   *    Bearer-token fallback covers that case.
   */
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),

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

type RawEnv = z.infer<typeof EnvSchema>;

function fail(problems: string[]): never {
  // eslint-disable-next-line no-console
  console.error('\n✖ Invalid environment configuration — refusing to start:\n');
  for (const p of problems) console.error(`  • ${p}`);
  // eslint-disable-next-line no-console
  console.error(
    '\nSee .env.example for every supported variable.\n',
  );
  process.exit(1);
}

/**
 * Production gate. A deployment that forgets its secrets must fail loudly at
 * boot — never run with a value an attacker can read out of this repository.
 */
function assertProductionSecrets(raw: RawEnv): string[] {
  const problems: string[] = [];
  if (raw.NODE_ENV !== 'production') return problems;

  if (!raw.JWT_SECRET) {
    problems.push(
      'JWT_SECRET is required in production. Generate one with: openssl rand -hex 32',
    );
  } else if (raw.JWT_SECRET === DEV_JWT_SECRET) {
    problems.push(
      'JWT_SECRET is still the published development default. Anyone can forge admin sessions with it — set a unique secret (openssl rand -hex 32).',
    );
  }

  if (!raw.ADMIN_PASSWORD) {
    problems.push('ADMIN_PASSWORD is required in production (min 8 characters).');
  } else if (raw.ADMIN_PASSWORD === DEV_ADMIN_PASSWORD) {
    problems.push(
      'ADMIN_PASSWORD is still the published development default. Set a unique strong password.',
    );
  }

  if (!raw.DATABASE_URL && !raw.ALLOW_EPHEMERAL_STORAGE) {
    problems.push(
      'DATABASE_URL is required in production (MySQL). Data would otherwise be lost on every restart. For a deliberately ephemeral demo deployment set ALLOW_EPHEMERAL_STORAGE=true.',
    );
  }
  if (!raw.REDIS_URL && !raw.ALLOW_EPHEMERAL_STORAGE) {
    problems.push(
      'REDIS_URL is required in production (BullMQ). Without it the queue is in-process, so jobs are lost on restart and cannot be shared across instances. For a deliberately ephemeral demo deployment set ALLOW_EPHEMERAL_STORAGE=true.',
    );
  }

  if (raw.COOKIE_SAMESITE === 'none' && raw.CLIENT_URL.startsWith('http://')) {
    problems.push(
      'COOKIE_SAMESITE=none requires HTTPS: browsers reject a Secure cookie over http. Serve CLIENT_URL over https or use strict/lax.',
    );
  }

  return problems;
}

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = Object.entries(parsed.error.flatten().fieldErrors).map(
    ([field, msgs]) => `${field}: ${msgs?.join(', ')}`,
  );
  fail(problems);
}

const raw = parsed.data;
const prodProblems = assertProductionSecrets(raw);
if (prodProblems.length > 0) fail(prodProblems);

export const env: RawEnv & { JWT_SECRET: string; ADMIN_PASSWORD: string } = {
  ...raw,
  // Non-production fallbacks only; production is guaranteed non-empty above.
  JWT_SECRET: raw.JWT_SECRET ?? DEV_JWT_SECRET,
  ADMIN_PASSWORD: raw.ADMIN_PASSWORD ?? DEV_ADMIN_PASSWORD,
};

export const isProd = env.NODE_ENV === 'production';

/** Every origin allowed to call the API with credentials. Never '*'. */
export const allowedOrigins: string[] = (() => {
  const list = new Set<string>([env.CLIENT_URL.replace(/\/$/, '')]);
  for (const o of (env.CORS_ORIGINS ?? '').split(',')) {
    const t = o.trim().replace(/\/$/, '');
    if (t) list.add(t);
  }
  return [...list];
})();

/** True when the admin cookie must be Secure (HTTPS-only). */
export const cookieSecure = isProd || env.COOKIE_SAMESITE === 'none';
