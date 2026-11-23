import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/errors.js';

/**
 * Temporary file storage + lifecycle. Completed media is NEVER kept
 * permanently: files expire and are removed by the cleanup worker.
 */

const safeId = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, '');

export const downloadDir = (): string => path.resolve(env.DOWNLOAD_DIR);
export const tempDir = (): string => path.resolve(env.TEMP_DIR);

export function ensureDirs(): void {
  fs.mkdirSync(downloadDir(), { recursive: true });
  fs.mkdirSync(tempDir(), { recursive: true });
}

export const finalPathFor = (jobId: string, ext: string): string =>
  path.join(downloadDir(), `${safeId(jobId)}.${ext}`);

// Each job owns a directory, including yt-dlp fragments and merge artifacts.
const activeWorkDirs = new Set<string>();
export const workDirFor = (jobId: string): string => path.join(tempDir(), safeId(jobId));

export async function beginTempWork(jobId: string): Promise<string> {
  const dir = workDirFor(jobId);
  activeWorkDirs.add(dir);
  try {
    await fsp.mkdir(dir, { recursive: true });
  } catch (err) {
    activeWorkDirs.delete(dir);
    throw err;
  }
  return dir;
}

export async function endTempWork(jobId: string): Promise<void> {
  const dir = workDirFor(jobId);
  try {
    await fsp.rm(dir, { recursive: true, force: true });
  } catch (err) {
    logger.warn({ err, jobId }, 'Could not remove job temporary files');
  } finally {
    activeWorkDirs.delete(dir);
  }
}

function sizeError(): ApiError {
  return new ApiError('DOWNLOAD_FAILED', `The media exceeds the ${env.MAX_DOWNLOAD_SIZE_MB} MB size limit.`);
}

/** Sample all source streams, fragments and merge files in this job's directory. */
export async function assertWorkSize(dir: string, maxBytes: number): Promise<void> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    try {
      const stat = await fsp.stat(path.join(dir, entry.name));
      if (stat.size > maxBytes) throw sizeError();
      total += stat.size;
    } catch (err) {
      // yt-dlp may rename/delete an intermediate file while it is being scanned.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
  // Merging normally has both inputs and output present at once. Allow that
  // duplication, plus small sidecar files, but bound the job's working set.
  if (total > 2 * maxBytes + 1024 * 1024) throw sizeError();
}

/** Check a growing FFmpeg output; ENOENT is normal before it creates the file. */
export async function assertOutputSize(file: string, maxBytes: number): Promise<void> {
  try {
    if ((await fsp.stat(file)).size > maxBytes) throw sizeError();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

/** Guard against filling the disk: refuse to start when free space is low. */
export async function assertDiskBudget(): Promise<void> {
  if (env.MIN_FREE_DISK_MB <= 0) return;
  try {
    const stats = await fsp.statfs(downloadDir());
    const freeMb = (stats.bavail * stats.bsize) / (1024 * 1024);
    if (freeMb < env.MIN_FREE_DISK_MB) {
      throw new Error('low-disk');
    }
  } catch (err) {
    if ((err as Error).message === 'low-disk') throw err;
    logger.warn({ err }, 'Could not stat filesystem; skipping disk budget check');
  }
}

export async function removeQuiet(p: string): Promise<void> {
  try {
    await fsp.rm(p, { force: true });
  } catch {
    /* already gone */
  }
}

export interface CleanupResult {
  expiredDownloads: number;
  staleTempFiles: number;
}

export interface FsStorageInfo {
  usedBytes: number;
  freeBytes: number;
  fileCount: number;
}

/** Filesystem snapshot of the temporary storage areas (downloads + temp). */
export async function fsStorageInfo(): Promise<FsStorageInfo> {
  let usedBytes = 0;
  let fileCount = 0;
  const walk = async (dir: string): Promise<void> => {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        try {
          const st = await fsp.stat(full);
          usedBytes += st.size;
          fileCount += 1;
        } catch {
          /* raced with cleanup */
        }
      }
    }
  };
  for (const dir of [downloadDir(), tempDir()]) await walk(dir);
  let freeBytes = 0;
  try {
    const stats = await fsp.statfs(downloadDir());
    freeBytes = stats.bavail * stats.bsize;
  } catch {
    /* statfs unsupported */
  }
  return { usedBytes, freeBytes, fileCount };
}

/** Delete expired completed files and abandoned temp files. */
export async function cleanupFiles(now = Date.now()): Promise<CleanupResult> {
  const result: CleanupResult = { expiredDownloads: 0, staleTempFiles: 0 };
  const expireMs = env.DOWNLOAD_EXPIRATION_MINUTES * 60_000;
  const tempMs = env.TEMP_FILE_RETENTION_MINUTES * 60_000;

  for (const dir of [downloadDir(), tempDir()]) {
    let entries: string[] = [];
    try {
      entries = await fsp.readdir(dir);
    } catch {
      continue;
    }
    const isDownloadDir = dir === downloadDir();
    for (const name of entries) {
      const full = path.join(dir, name);
      if (!isDownloadDir && activeWorkDirs.has(full)) continue;
      try {
        const st = await fsp.lstat(full);
        const age = now - st.mtimeMs;
        if ((isDownloadDir && age > expireMs) || (!isDownloadDir && age > tempMs)) {
          await fsp.rm(full, { force: true, recursive: st.isDirectory() });
          if (isDownloadDir) result.expiredDownloads += 1;
          else result.staleTempFiles += 1;
        }
      } catch {
        /* ignore races */
      }
    }
  }
  return result;
}
