import type { Request, Response } from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { db } from '../db/index.js';
import { cancelJob, createDownload, removeJob } from '../services/downloadService.js';
import { asyncH } from '../utils/asyncH.js';
import { ApiError } from '../utils/errors.js';
import { signDeliveryToken, verifyDeliveryToken } from '../utils/deliveryToken.js';
import { buildFileName } from '../utils/filename.js';

const CreateSchema = z.object({
  analysisId: z.string().uuid(),
  format: z.enum(['mp4', 'mp3']),
  quality: z.string().min(1).max(16), // e.g. "720p" or "320 kbps"
});

const ipKeyOf = (req: Request): string => req.ip ?? 'unknown';

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
  '.m4a': 'audio/mp4',
};

export const create = asyncH(async (req: Request, res: Response) => {
  const body = CreateSchema.parse(req.body);
  const job = await createDownload({
    analysisId: body.analysisId,
    format: body.format,
    quality: body.quality,
    ipKey: ipKeyOf(req),
  });
  res.status(201).json({ success: true, data: { jobId: job.id, status: job.status.toLowerCase() } });
});

export const status = asyncH(async (req: Request, res: Response) => {
  const job = await db().getJob(req.params.jobId);
  if (!job) throw ApiError.notFound('Download job not found.');

  // Delivery URL is only issued for finished, unexpired files.
  let downloadUrl: string | null = null;
  if (job.status === 'COMPLETED' && job.filePath && (!job.expiresAt || job.expiresAt.getTime() > Date.now())) {
    const { token } = signDeliveryToken(job.id);
    downloadUrl = `/api/v1/downloads/${job.id}/file?token=${token}`;
  }

  res.json({
    success: true,
    data: {
      id: job.id,
      status: job.status.toLowerCase(),
      progress: job.progress,
      platform: job.platform,
      title: job.title,
      format: job.format,
      quality: job.quality,
      fileSize: job.fileSize, // canonical bytes
      fileName: job.fileName,
      downloadedBytes: job.downloadedBytes,
      speedBps: job.speedBps,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      downloadUrl,
      expiresAt: job.expiresAt,
      createdAt: job.createdAt,
    },
  });
});

/**
 * File delivery. Checks, in order:
 *  1. job exists  2. completed  3. not expired  4. file exists on disk
 *  5. signed delivery token valid for THIS job  6. path stays inside the
 *     storage dir (paths are server-generated UUIDs; defense-in-depth anyway).
 * Supports HTTP Range (206) for efficient large downloads.
 */
export const file = asyncH(async (req: Request, res: Response) => {
  const job = await db().getJob(req.params.jobId);
  if (!job) throw ApiError.notFound('Download job not found.');
  if (job.status === 'EXPIRED') throw new ApiError('FILE_EXPIRED', 'This download has expired.');
  if (job.status !== 'COMPLETED' || !job.filePath) {
    throw new ApiError('FILE_NOT_FOUND', 'The file is not ready yet.');
  }
  if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
    throw new ApiError('FILE_EXPIRED', 'This download has expired.');
  }
  if (!verifyDeliveryToken(job.id, req.query.token)) {
    throw ApiError.unauthorized('This download link is invalid or has expired. Refresh the job status for a new link.');
  }

  const filePath = path.resolve(job.filePath);
  const allowedRoot = path.resolve(path.dirname(job.filePath));
  if (!filePath.startsWith(allowedRoot + path.sep)) {
    throw ApiError.forbidden('Invalid file reference.');
  }
  let stat: fs.Stats;
  try {
    stat = await fsp.stat(filePath);
  } catch {
    throw new ApiError('FILE_NOT_FOUND', 'The file could not be found on disk.');
  }

  // ── Server-authoritative delivery record ──────────────────────────────
  await db().updateJob(job.id, {
    deliveredAt: job.deliveredAt ?? new Date(),
    deliveryCount: job.deliveryCount + 1,
  });
  await db().addEvent(job.id, 'download_requested', `File requested (${stat.size} bytes)`);
  await db().track('file_delivered', job.platform, { bytes: stat.size }).catch(() => undefined);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
  const fileName = job.fileName ?? buildFileName(job.title, ext.replace('.', '') || 'bin');

  // RFC 6266: ASCII fallback + UTF-8 encoded name.
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
  const utf8Name = encodeURIComponent(fileName);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
  );
  res.setHeader('Cache-Control', 'no-store');

  // ── Range handling (single range; anything exotic falls back to 200) ──
  const total = stat.size;
  const rangeHeader = req.headers.range;
  let start = 0;
  let end = total - 1;
  let statusCode = 200;

  if (rangeHeader) {
    const m = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
    if (m && (m[1] || m[2])) {
      if (m[1] && m[2]) {
        start = parseInt(m[1], 10);
        end = Math.min(parseInt(m[2], 10), total - 1);
      } else if (m[1]) {
        start = parseInt(m[1], 10);
      } else if (m[2]) {
        start = Math.max(0, total - parseInt(m[2], 10));
      }
      if (!Number.isFinite(start) || start < 0 || start >= total || end < start) {
        res.setHeader('Content-Range', `bytes */${total}`);
        res.status(416).end();
        return;
      }
      statusCode = 206;
    }
  }

  const length = end - start + 1;
  res.setHeader('Content-Length', String(length)); // actual bytes, not an estimate
  if (statusCode === 206) {
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
  }
  res.status(statusCode);

  // ── Stream with completion accounting ─────────────────────────────────
  const stream = fs.createReadStream(filePath, { start, end });
  let sent = 0;
  stream.on('data', (chunk: Buffer | string) => {
    sent += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
  });
  stream.on('close', () => {
    const completed = sent === length;
    db()
      .addEvent(
        job.id,
        completed ? 'download_completed' : 'download_failed',
        completed ? `Delivered ${sent} bytes` : `Transfer interrupted after ${sent} of ${length} bytes`,
        { bytes: sent },
      )
      .catch(() => undefined);
  });
  stream.on('error', () => {
    if (!res.headersSent) return;
    res.end();
  });
  stream.pipe(res);
});

/**
 * Client-reported delivery events. Strictly allow-listed — the server never
 * trusts client-reported sizes or arbitrary event types; it records its own
 * authoritative byte counts at the file endpoint.
 */
const EventSchema = z.object({
  type: z.enum(['download_started']),
});

export const clientEvent = asyncH(async (req: Request, res: Response) => {
  const { type } = EventSchema.parse(req.body);
  const job = await db().getJob(req.params.jobId);
  if (!job) throw ApiError.notFound('Download job not found.');
  await db().addEvent(job.id, type, 'Browser reported download start');
  res.json({ success: true });
});

export const cancel = asyncH(async (req: Request, res: Response) => {
  const job = await cancelJob(req.params.jobId);
  res.json({ success: true, data: { jobId: job.id, status: job.status.toLowerCase() } });
});

export const remove = asyncH(async (req: Request, res: Response) => {
  await removeJob(req.params.jobId);
  res.json({ success: true });
});
