import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { db } from '../db/index.js';
import type { FormatPlan } from '../providers/types.js';
import { requireProvider } from '../providers/registry.js';
import type { JobQueue } from '../queues/index.js';
import type { DownloadJobRecord } from '../types/index.js';
import { ApiError } from '../utils/errors.js';
import { buildFileName } from '../utils/filename.js';
import * as ffmpeg from './engine/ffmpeg.js';
import { downloadStreams } from './engine/ytdlp.js';
import {
  assertDiskBudget,
  ensureDirs,
  finalPathFor,
  removeQuiet,
  tempPathFor,
} from './storage.js';

/** In-flight cancellation flags, keyed by job id. */
const cancellations = new Map<string, { cancelled: boolean }>();

let queue: JobQueue | null = null;
export function bindQueue(q: JobQueue): void {
  queue = q;
}

/**
 * Resolve the execution plan for a job by re-probing the source. The probe
 * is authoritative (formats can change between analysis and download) and
 * this keeps retries/restarts working even after the analysis cache expires.
 */
async function resolvePlan(job: DownloadJobRecord): Promise<{ plan: FormatPlan; url: string }> {
  const { provider } = requireProvider(job.sourceUrl);
  const { info, plans } = await provider.analyzeWithPlans(job.sourceUrl);
  const option = info.formats.find((f) => f.container === job.format && f.quality === job.quality);
  if (!option) {
    throw new ApiError('CONTENT_UNAVAILABLE', 'The requested format is no longer available for this media.');
  }
  const plan = plans[option.id];
  if (!plan) throw new ApiError('CONTENT_UNAVAILABLE', 'The requested format is no longer available.');
  return { plan, url: job.sourceUrl };
}

export interface CreateDownloadInput {
  analysisId: string;
  format: string;
  quality: string;
  ipKey: string;
}

export async function createDownload(input: CreateDownloadInput): Promise<DownloadJobRecord> {
  ensureDirs();

  const analysis = await db().getAnalysis(input.analysisId);
  if (!analysis) {
    throw new ApiError('NOT_FOUND', 'This analysis has expired. Please analyze the URL again.');
  }
  const option = analysis.info.formats.find(
    (f) => f.container === input.format && f.quality === input.quality,
  );
  if (!option) {
    throw ApiError.badRequest('The selected format is not available for this media.');
  }
  const plan = analysis.plans[option.id];
  if (!plan) {
    throw ApiError.badRequest('The selected format cannot be processed.');
  }

  const active = await db().countActiveJobsForIp(input.ipKey);
  if (active >= env.MAX_CONCURRENT_JOBS_PER_IP) {
    throw new ApiError(
      'JOB_LIMIT_REACHED',
      `You already have ${active} downloads in progress. Please wait for one to finish.`,
    );
  }

  try {
    await assertDiskBudget();
  } catch {
    throw new ApiError('STORAGE_FULL', 'The server is low on storage. Please try again later.');
  }

  const jobId = randomUUID();
  const job = await db().createJob({
    id: jobId,
    ipKey: input.ipKey,
    sourceUrl: analysis.url,
    platform: analysis.info.platform,
    title: analysis.info.title,
    thumbnailUrl: analysis.info.thumbnail,
    format: option.container,
    quality: option.quality,
    expiresMinutes: env.DOWNLOAD_EXPIRATION_MINUTES,
  });
  await db().addEvent(jobId, 'job_created', `Job created for ${option.container} ${option.quality}`, {
    analysisId: analysis.id,
  });
  await db().track('download_created', analysis.info.platform).catch(() => undefined);

  if (!queue) throw new ApiError('SERVER_ERROR', 'Download queue is not initialised.');
  await queue.enqueue(jobId);
  logger.info({ jobId, platform: analysis.info.platform, format: option.container }, 'Download job queued');
  return job;
}

/**
 * The worker-side pipeline:
 * source → engine stream download → FFmpeg (remux/convert) → final file.
 * Never called from Express handlers directly; always through the queue.
 */
export async function processJob(jobId: string): Promise<void> {
  const job = await db().getJob(jobId);
  if (!job || job.status !== 'QUEUED') return;

  const signal = { cancelled: false };
  cancellations.set(jobId, signal);
  const temp = tempPathFor(jobId, 'in');

  try {
    // Re-verify the source first — statuses always reflect the real phase.
    await db().updateJob(jobId, { status: 'ANALYZING', progress: 1, startedAt: new Date() });
    const { plan, url } = await resolvePlan(job);
    if (signal.cancelled) throw cancelledError();

    await db().updateJob(jobId, { status: 'DOWNLOADING', progress: 2 });
    await db().addEvent(jobId, 'downloading', 'Fetching media streams');

    // Throttled telemetry writes (progress %, bytes, speed) — ~1/s max.
    let lastTelemetryWrite = 0;
    await downloadStreams(
      url,
      plan.selector ?? 'best',
      temp,
      (p) => {
        const now = Date.now();
        if (now - lastTelemetryWrite < 700 && p.percent < 100) return;
        lastTelemetryWrite = now;
        db()
          .updateJob(jobId, {
            progress: Math.max(1, Math.min(80, Math.round(p.percent * 0.8))),
            downloadedBytes: p.downloadedBytes ?? undefined,
            speedBps: p.speedBps ?? undefined,
          })
          .catch(() => undefined);
      },
      signal,
    );
    if (signal.cancelled) throw cancelledError();

    const maxBytes = env.MAX_DOWNLOAD_SIZE_MB * 1024 * 1024;

    await db().updateJob(jobId, { status: 'PROCESSING', progress: 85, speedBps: null });
    await db().addEvent(jobId, 'processing_started', plan.kind === 'audio' ? 'Converting audio' : 'Preparing video container');

    // yt-dlp may append the real media extension to the -o template on some
    // platforms/versions (e.g. "<id>.in.mp4"). Locate whatever it wrote.
    let tempFile = temp;
    try {
      await fs.stat(tempFile);
    } catch {
      const dir = path.dirname(temp);
      const base = path.basename(temp);
      const entries = await fs.readdir(dir).catch(() => [] as string[]);
      const match = entries.find((n) => n.startsWith(`${base}.`)) ?? entries.find((n) => n === base);
      if (!match) {
        throw new ApiError('DOWNLOAD_FAILED', 'The source did not produce a downloadable file.');
      }
      tempFile = path.join(dir, match);
    }

    const tempStat = await fs.stat(tempFile).catch(() => {
      throw new ApiError('DOWNLOAD_FAILED', 'The downloaded file could not be read from storage.');
    });
    if (tempStat.size > maxBytes) {
      throw new ApiError('DOWNLOAD_FAILED', `The media exceeds the ${env.MAX_DOWNLOAD_SIZE_MB} MB size limit.`);
    }

    const finalPath = finalPathFor(jobId, plan.container);
    try {
      if (plan.kind === 'audio') {
        await ffmpeg.toMp3(tempFile, finalPath, plan.bitrate ?? 192);
      } else {
        // Remux (stream copy) into MP4 — no re-encoding unless required.
        await ffmpeg.remux(tempFile, finalPath);
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('FFMPEG_FAILED', 'Media processing failed on this server.');
    } finally {
      await removeQuiet(tempFile);
    }

    // Authoritative size: read from the filesystem, never estimated.
    const finalStat = await fs.stat(finalPath);
    if (finalStat.size > maxBytes) {
      await removeQuiet(finalPath);
      throw new ApiError('DOWNLOAD_FAILED', `The media exceeds the ${env.MAX_DOWNLOAD_SIZE_MB} MB size limit.`);
    }

    const fileName = buildFileName(job.title, plan.container);
    await db().updateJob(jobId, {
      status: 'COMPLETED',
      progress: 100,
      fileSize: finalStat.size, // canonical file_size_bytes
      fileName,
      filePath: finalPath,
      downloadedBytes: finalStat.size,
      speedBps: null,
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + env.DOWNLOAD_EXPIRATION_MINUTES * 60_000),
    });
    await db().addEvent(jobId, 'file_ready', `File ready (${finalStat.size} bytes)`, {
      bytes: finalStat.size,
      fileName,
    });
    await db().track('download_completed', job.platform).catch(() => undefined);
    logger.info({ jobId, bytes: finalStat.size }, 'Download completed');
  } catch (err) {
    const api = err instanceof ApiError ? err : new ApiError('DOWNLOAD_FAILED', 'The download failed unexpectedly.');
    const wasCancelled = signal.cancelled || api.message === 'Cancelled.';
    await db().updateJob(
      jobId,
      wasCancelled
        ? { status: 'CANCELLED', errorMessage: 'Cancelled by user.' }
        : {
            status: 'FAILED',
            errorCode: api.code,
            errorMessage: api.message,
            completedAt: new Date(),
          },
    );
    await db().addEvent(jobId, wasCancelled ? 'cancelled' : 'failed', api.message);
    if (!wasCancelled) {
      logger.error(
        {
          jobId,
          code: api.code,
          message: api.message,
          // Server-side only (error.log) — makes Windows/edge failures diagnosable.
          cause: err instanceof Error ? err.message : undefined,
          stack: err instanceof Error ? err.stack?.split('\n').slice(1, 4).join(' | ') : undefined,
        },
        'Download job failed',
      );
    }
  } finally {
    cancellations.delete(jobId);
    await removeQuiet(temp);
  }
}

function cancelledError(): ApiError {
  return new ApiError('DOWNLOAD_FAILED', 'Cancelled.');
}

export async function cancelJob(jobId: string): Promise<DownloadJobRecord> {
  const job = await db().getJob(jobId);
  if (!job) throw ApiError.notFound('Download job not found.');

  const flag = cancellations.get(jobId);
  if (flag) flag.cancelled = true;

  if (['QUEUED', 'ANALYZING', 'DOWNLOADING', 'PROCESSING'].includes(job.status)) {
    await db().updateJob(jobId, { status: 'CANCELLED', errorMessage: 'Cancelled by user.' });
    await db().addEvent(jobId, 'cancelled', 'Cancelled by user');
  }
  if (job.filePath) await removeQuiet(job.filePath);
  return (await db().getJob(jobId))!;
}

export async function retryJob(jobId: string): Promise<DownloadJobRecord> {
  const job = await db().getJob(jobId);
  if (!job) throw ApiError.notFound('Download job not found.');
  if (!['FAILED', 'CANCELLED', 'EXPIRED'].includes(job.status)) {
    throw ApiError.badRequest('Only failed, cancelled or expired jobs can be retried.');
  }
  if (job.filePath) await removeQuiet(job.filePath);
  await db().updateJob(jobId, {
    status: 'QUEUED',
    progress: 0,
    errorCode: null,
    errorMessage: null,
    filePath: null,
    fileSize: null,
    startedAt: null,
    completedAt: null,
    expiresAt: new Date(Date.now() + env.DOWNLOAD_EXPIRATION_MINUTES * 60_000),
  });
  await db().addEvent(jobId, 'retry', 'Job requeued');
  if (!queue) throw new ApiError('SERVER_ERROR', 'Download queue is not initialised.');
  await queue.enqueue(jobId);
  return (await db().getJob(jobId))!;
}

export async function removeJob(jobId: string): Promise<void> {
  const job = await db().getJob(jobId);
  if (!job) throw ApiError.notFound('Download job not found.');
  const flag = cancellations.get(jobId);
  if (flag) flag.cancelled = true;
  if (job.filePath) await removeQuiet(job.filePath);
  await db().deleteJob(jobId);
}

/** Marks completed jobs past their expiry window as EXPIRED. */
export async function expireStaleJobs(): Promise<number> {
  const { items } = await db().listJobs({ status: 'COMPLETED', limit: 500 });
  let expired = 0;
  const now = Date.now();
  for (const job of items) {
    if (job.expiresAt && job.expiresAt.getTime() < now) {
      if (job.filePath) await removeQuiet(job.filePath);
      await db().updateJob(job.id, { status: 'EXPIRED', errorMessage: 'File expired and was removed.' });
      expired += 1;
    }
  }
  return expired;
}
