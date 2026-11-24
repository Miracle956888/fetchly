import { Router } from 'express';
import * as admin from '../controllers/admin.controller.js';
import * as downloads from '../controllers/downloads.controller.js';
import * as health from '../controllers/health.controller.js';
import * as media from '../controllers/media.controller.js';
import * as platforms from '../controllers/platforms.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { analyzeLimiter, loginLimiter, pollingLimiter } from '../middleware/rateLimit.js';

export function createApiRouter(): Router {
  const router = Router();

  // ── Health ────────────────────────────────────────────────────────────
  router.get('/health', health.health);
  router.get('/health/database', health.healthDatabase);
  router.get('/health/redis', health.healthRedis);
  router.get('/health/ffmpeg', health.healthFfmpeg);
  router.get('/health/engine', health.healthEngine);

  // ── Public ────────────────────────────────────────────────────────────
  router.get('/platforms', platforms.list);
  router.post('/media/analyze', analyzeLimiter, media.analyze);
  router.post('/downloads', downloads.create);
  router.get('/downloads/:jobId', pollingLimiter, downloads.status);
  router.get('/downloads/:jobId/file', pollingLimiter, downloads.file);
  router.post('/downloads/:jobId/events', downloads.clientEvent);
  router.delete('/downloads/:jobId', downloads.cancel);
  router.delete('/downloads/:jobId/record', downloads.remove);

  // ── Admin (every route server-side authorized) ───────────────────────
  router.post('/admin/auth/login', loginLimiter, admin.login);
  router.use('/admin', requireAdmin);
  router.post('/admin/auth/logout', admin.logout);
  router.get('/admin/auth/me', admin.me);
  router.get('/admin/stats', admin.stats);
  router.get('/admin/storage', admin.storage);
  router.get('/admin/jobs', admin.jobs);
  router.post('/admin/jobs/:id/cancel', admin.jobCancel);
  router.post('/admin/jobs/:id/retry', admin.jobRetry);
  router.delete('/admin/jobs/:id', admin.jobDelete);
  router.get('/admin/platforms', admin.platforms);
  router.put('/admin/platforms/:slug', admin.platformUpdate);
  router.get('/admin/users', admin.users);
  router.get('/admin/settings', admin.settings);
  router.put('/admin/settings', admin.settingsUpdate);
  router.get('/admin/analytics', admin.analytics);
  router.get('/admin/events', admin.events);
  router.get('/admin/system', admin.system);

  return router;
}
