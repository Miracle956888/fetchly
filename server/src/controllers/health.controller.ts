import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import * as ffmpeg from '../services/engine/ffmpeg.js';
import * as ytdlp from '../services/engine/ytdlp.js';
import { asyncH } from '../utils/asyncH.js';

export const health = asyncH(async (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), persistence: db().kind });
});

export const healthDatabase = asyncH(async (_req: Request, res: Response) => {
  const ok = await db().ping();
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'unavailable', persistence: db().kind });
});

export const healthRedis = asyncH(async (_req: Request, res: Response) => {
  if (!env.REDIS_URL) {
    return res.status(200).json({ status: 'not-configured', detail: 'Using in-process queue.' });
  }
  try {
    const { default: Redis } = await import('ioredis');
    const conn = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await conn.connect();
    await conn.ping();
    await conn.quit();
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

export const healthFfmpeg = asyncH(async (_req: Request, res: Response) => {
  const info = await ffmpeg.checkAvailable();
  res.status(info.available ? 200 : 503).json({ status: info.available ? 'ok' : 'unavailable', version: info.version });
});

export const healthEngine = asyncH(async (_req: Request, res: Response) => {
  const info = await ytdlp.checkAvailable();
  res.status(info.available ? 200 : 503).json({ status: info.available ? 'ok' : 'unavailable', version: info.version });
});
