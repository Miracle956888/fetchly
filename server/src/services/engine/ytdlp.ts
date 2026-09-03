import { spawn } from 'node:child_process';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/errors.js';

/**
 * Thin, safe wrapper around the yt-dlp extraction engine.
 *
 * Security model:
 *  - the binary path comes exclusively from server configuration
 *  - arguments are a fixed allow-list built by this module; user input only
 *    ever appears as the final URL argument, after provider/SSRF checks
 *  - no shell is ever involved (spawn with argument array)
 */

const binary = (): string => env.YTDLP_PATH || 'yt-dlp';

export interface YtDlpFormat {
  format_id: string;
  ext?: string;
  height?: number | null;
  width?: number | null;
  fps?: number | null;
  vcodec?: string | null;
  acodec?: string | null;
  tbr?: number | null;
  abr?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
}

export interface YtDlpInfo {
  id: string;
  title?: string;
  duration?: number | null;
  thumbnail?: string | null;
  uploader?: string | null;
  channel?: string | null;
  webpage_url?: string;
  availability?: string | null;
  formats?: YtDlpFormat[];
}

function run(args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new ApiError('TIMEOUT', 'The media engine took too long to respond.'));
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      stdout += d;
      if (stdout.length > 25 * 1024 * 1024) {
        clearTimeout(timer);
        child.kill('SIGKILL');
        reject(new ApiError('SERVER_ERROR', 'Engine output exceeded limits.'));
      }
    });
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new ApiError('ENGINE_UNAVAILABLE', 'The media engine is not installed on this server.'));
      } else {
        reject(new ApiError('SERVER_ERROR', 'Media engine error.'));
      }
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(stdout);
      logger.error({ code, stderr: stderr.slice(0, 2000) }, 'yt-dlp exited non-zero');
      reject(classifyYtDlpFailure(stderr));
    });
  });
}

/** Map engine stderr to user-safe, domain-specific errors. */
function classifyYtDlpFailure(stderr: string): ApiError {
  const s = stderr.toLowerCase();
  if (s.includes('private video') || s.includes('sign in') || s.includes('login')) {
    return new ApiError('PRIVATE_CONTENT', 'This media is private or requires an account. Only public content can be downloaded.');
  }
  if (s.includes('not found') || s.includes('does not exist') || s.includes('unavailable') || s.includes('removed')) {
    return new ApiError('CONTENT_UNAVAILABLE', 'The media could not be found. It may have been removed by its owner.');
  }
  if (s.includes('drm') || s.includes('age')) {
    return new ApiError('CONTENT_UNAVAILABLE', 'This media is restricted and cannot be downloaded.');
  }
  if (s.includes('rate limit') || s.includes('too many requests') || s.includes('429')) {
    return new ApiError('SOURCE_UNAVAILABLE', 'The source platform is rate limiting requests. Please try again later.');
  }
  if (s.includes('unable to extract')) {
    return new ApiError(
      'SOURCE_UNAVAILABLE',
      'The platform blocked extraction. Update the media engine (run "yt-dlp -U" on the server) and try again.',
    );
  }
  if (s.includes('unexpected response') || s.includes('please report this issue')) {
    return new ApiError(
      'SOURCE_UNAVAILABLE',
      'The platform changed its response format and the media engine needs an update. Run "yt-dlp -U" on the server, or try again later.',
    );
  }
  if (s.includes('network') || s.includes('getaddrinfo') || s.includes('connection')) {
    return new ApiError('SOURCE_UNAVAILABLE', 'Could not reach the source platform. Check connectivity and try again.');
  }
  return new ApiError('DOWNLOAD_FAILED', 'The media could not be analyzed.');
}

export async function checkAvailable(): Promise<{ available: boolean; version: string | null }> {
  return new Promise((resolve) => {
    const child = spawn(binary(), ['--version'], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ available: false, version: null });
    }, 5000);
    child.stdout.on('data', (d) => (out += d));
    child.on('error', () => {
      clearTimeout(timer);
      resolve({ available: false, version: null });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ available: code === 0, version: code === 0 ? out.trim() : null });
    });
  });
}

const COMMON_ARGS = [
  '--no-warnings',
  '--no-playlist',
  '--no-check-certificates',
  '--socket-timeout',
  '20',
  '--retries',
  '2',
];

/** Metadata-only analysis. */
export async function probeUrl(url: string): Promise<YtDlpInfo> {
  const out = await run(
    ['--dump-single-json', '--skip-download', ...COMMON_ARGS, url],
  60_000);
  try {
    return JSON.parse(out) as YtDlpInfo;
  } catch {
    throw new ApiError('SOURCE_UNAVAILABLE', 'The source returned unreadable metadata.');
  }
}

export interface StreamDownloadProgress {
  percent: number;
  /** Bytes downloaded so far (parsed from engine output). */
  downloadedBytes?: number;
  /** Expected total in bytes, when the engine reports one. */
  totalBytes?: number;
  /** Transfer speed in bytes/second. */
  speedBps?: number;
}

function parseSize(spec: string | undefined): number | undefined {
  if (!spec) return undefined;
  const m = spec.trim().match(/^([\d.]+)\s*(B|KiB|MiB|GiB|TiB|KB|MB|GB|TB)?$/i);
  if (!m) return undefined;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value)) return undefined;
  const unit = (m[2] ?? 'B').toLowerCase();
  const mult: Record<string, number> = {
    b: 1,
    kib: 1024, kb: 1000,
    mib: 1024 ** 2, mb: 1000 ** 2,
    gib: 1024 ** 3, gb: 1000 ** 3,
    tib: 1024 ** 4, tb: 1000 ** 4,
  };
  return Math.round(value * (mult[unit] ?? 1));
}

/**
 * Download the selected streams for a format option to `outPath`.
 * `selector` is a yt-dlp format expression built ONLY from format ids we
 * received from our own probe — never from user text.
 */
export function downloadStreams(
  url: string,
  selector: string,
  outPath: string,
  onProgress: (p: StreamDownloadProgress) => void,
  signal: { cancelled: boolean },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-f',
      selector,
      '--newline',
      '--no-part',
      '--merge-output-format',
      'mp4',
      ...COMMON_ARGS,
      '-o',
      outPath,
      url,
    ];
    if (env.FFMPEG_PATH) args.push('--ffmpeg-location', env.FFMPEG_PATH);
    const child = spawn(binary(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    const timer = setInterval(() => {
      if (signal.cancelled) {
        child.kill('SIGKILL');
      }
    }, 1000);

    // Buffer across chunks — progress lines may be split mid-line.
    let lineBuffer = '';
    const handleLine = (line: string): void => {
      // e.g. "[download]  68.2% of ~ 84.20MiB at  2.41MiB/s ETA 00:07"
      const m = line.match(/\[download\]\s+(?<p>\d{1,3}(?:\.\d+)?)%/);
      if (!m?.groups?.p) return;
      const progress: StreamDownloadProgress = {
        percent: Math.min(100, Math.round(parseFloat(m.groups.p))),
      };
      const sizeMatch = line.match(/of\s+~?\s*([\d.]+\s*[KMGT]?i?B)/i);
      if (sizeMatch) progress.totalBytes = parseSize(sizeMatch[1]);
      const speedMatch = line.match(/at\s+([\d.]+\s*[KMGT]?i?B)\/s/i);
      if (speedMatch) progress.speedBps = parseSize(speedMatch[1]);
      // Derive downloaded bytes from percent × total (engine rarely prints the
      // absolute count); both numbers come from the engine, not estimates.
      if (progress.totalBytes !== undefined) {
        progress.downloadedBytes = Math.round((progress.percent / 100) * progress.totalBytes);
      }
      onProgress(progress);
    };
    child.stdout.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) handleLine(line);
    });
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      clearInterval(timer);
      reject(
        (err as NodeJS.ErrnoException).code === 'ENOENT'
          ? new ApiError('ENGINE_UNAVAILABLE', 'The media engine is not installed on this server.')
          : new ApiError('DOWNLOAD_FAILED', 'Download failed to start.'),
      );
    });
    child.on('close', (code) => {
      clearInterval(timer);
      if (signal.cancelled) return reject(new ApiError('DOWNLOAD_FAILED', 'Cancelled.'));
      if (code === 0) return resolve();
      reject(classifyYtDlpFailure(stderr));
    });
  });
}
