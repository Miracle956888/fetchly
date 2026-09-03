import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env, isProd } from '../config/env.js';
import { db } from '../db/index.js';
import { ADMIN_COOKIE, signAdminToken } from '../middleware/auth.js';
import { cancelJob, removeJob, retryJob } from '../services/downloadService.js';
import * as ffmpeg from '../services/engine/ffmpeg.js';
import * as ytdlp from '../services/engine/ytdlp.js';
import { listPlatforms, setPlatformEnabled } from '../services/platformService.js';
import { asyncH } from '../utils/asyncH.js';
import { ApiError } from '../utils/errors.js';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: isProd,
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
};

const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});

export const login = asyncH(async (req: Request, res: Response) => {
  const { email, password } = LoginSchema.parse(req.body);
  const user = await db().findByEmail(email.toLowerCase());
  if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
    throw ApiError.unauthorized('Invalid email or password.');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password.');

  const token = signAdminToken({ sub: user.id, email: user.email, role: user.role });
  res.cookie(ADMIN_COOKIE, token, COOKIE_OPTS);
  await db().track('admin_login').catch(() => undefined);
  res.json({ success: true, data: { email: user.email, name: user.name, token } });
});

export const logout = asyncH(async (_req: Request, res: Response) => {
  res.clearCookie(ADMIN_COOKIE, { path: '/' });
  res.json({ success: true });
});

export const me = asyncH(async (req: Request, res: Response) => {
  const admin = (req as Request & { admin?: { email: string; sub: string } }).admin;
  res.json({ success: true, data: { email: admin?.email, id: admin?.sub } });
});

export const stats = asyncH(async (_req: Request, res: Response) => {
  const s = await db().jobStats();
  res.json({ success: true, data: s });
});

const JobsQuerySchema = z.object({
  status: z
    .enum(['QUEUED', 'ANALYZING', 'DOWNLOADING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'])
    .optional(),
  platform: z.string().max(32).optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const jobs = asyncH(async (req: Request, res: Response) => {
  const q = JobsQuerySchema.parse(req.query);
  const pageSize = 25;
  const { items, total } = await db().listJobs({
    status: q.status,
    platform: q.platform,
    search: q.search,
    limit: pageSize,
    offset: (q.page - 1) * pageSize,
  });
  res.json({ success: true, data: { items, total, page: q.page, pageSize } });
});

export const jobCancel = asyncH(async (req: Request, res: Response) => {
  const job = await cancelJob(req.params.id);
  res.json({ success: true, data: job });
});

export const jobRetry = asyncH(async (req: Request, res: Response) => {
  const job = await retryJob(req.params.id);
  res.json({ success: true, data: job });
});

export const jobDelete = asyncH(async (req: Request, res: Response) => {
  await removeJob(req.params.id);
  res.json({ success: true });
});

export const platforms = asyncH(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await listPlatforms() });
});

const PlatformSchema = z.object({ enabled: z.boolean() });

export const platformUpdate = asyncH(async (req: Request, res: Response) => {
  const { enabled } = PlatformSchema.parse(req.body);
  const platforms = await setPlatformEnabled(req.params.slug, enabled);
  res.json({ success: true, data: platforms });
});

export const users = asyncH(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await db().listUsers() });
});

export const settings = asyncH(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await db().getSettings() });
});

const SettingsSchema = z.record(z.string().min(1).max(500));

export const settingsUpdate = asyncH(async (req: Request, res: Response) => {
  const body = SettingsSchema.parse(req.body);
  for (const [key, value] of Object.entries(body)) {
    await db().setSetting(key, value);
  }
  res.json({ success: true, data: await db().getSettings() });
});

export const analytics = asyncH(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await db().topAnalytics(20) });
});

export const events = asyncH(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
  res.json({ success: true, data: await db().listEvents(limit) });
});

/** Temporary-storage usage for the admin dashboard. */
export const storage = asyncH(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await db().storageInfo() });
});

/** Non-secret system snapshot for the admin System page. */
export const system = asyncH(async (_req: Request, res: Response) => {
  const [ffmpegInfo, engineInfo, dbOk] = await Promise.all([
    ffmpeg.checkAvailable(),
    ytdlp.checkAvailable(),
    db().ping(),
  ]);
  res.json({
    success: true,
    data: {
      node: process.version,
      uptimeSec: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      persistence: db().kind,
      database: dbOk ? 'ok' : 'unavailable',
      redis: env.REDIS_URL ? 'configured' : 'not-configured (in-process queue)',
      ffmpeg: ffmpegInfo,
      engine: engineInfo,
      limits: {
        maxDownloadSizeMb: env.MAX_DOWNLOAD_SIZE_MB,
        downloadExpirationMinutes: env.DOWNLOAD_EXPIRATION_MINUTES,
        maxConcurrentJobsPerIp: env.MAX_CONCURRENT_JOBS_PER_IP,
        rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      },
    },
  });
});
