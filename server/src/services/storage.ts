import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

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

export const tempPathFor = (jobId: string, ext: string): string =>
  path.join(tempDir(), `${safeId(jobId)}.${ext}`);
export const finalPathFor = (jobId: string, ext: string): string =>
  path.join(downloadDir(), `${safeId(jobId)}.${ext}`);

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
  for (const dir of [downloadDir(), tempDir()]) {
    let entries: string[] = [];
    try {
      entries = await fsp.readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      try {
        const st = await fsp.stat(path.join(dir, name));
        if (st.isFile()) {
          usedBytes += st.size;
          fileCount += 1;
        }
      } catch {
        /* raced with cleanup */
      }
    }
  }
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
      try {
        const st = await fsp.stat(full);
        const age = now - st.mtimeMs;
        if ((isDownloadDir && age > expireMs) || (!isDownloadDir && age > tempMs)) {
          await fsp.rm(full, { force: true });
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
