import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/errors.js';
import { assertWorkSize } from '../storage.js';
import { runGuarded, type CancellationFlag } from './process.js';

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

// Extractor errors can contain media/CDN URLs with signed query parameters.
// Preserve diagnostics, but do not put those URLs into public-host logs.
function safeStderr(stderr: string): string {
  return stderr.replace(/https?:\/\/[^\s"'<>]+/gi, '[url]').slice(-2000);
}

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

async function run(args: string[], timeoutMs: number, signal?: CancellationFlag): Promise<string> {
  const result = await runGuarded(binary(), args, {
    timeoutMs,
    timeoutMessage: 'The media engine took too long to respond.',
    unavailableMessage: 'The media engine is not installed on this server.',
    startErrorMessage: 'Media engine error.',
    signal,
  });
  if (result.code === 0) return result.stdout;
  logger.error({ code: result.code, stderr: safeStderr(result.stderr) }, 'yt-dlp exited non-zero');
  throw classifyYtDlpFailure(result.stderr);
}

/** Map engine stderr to user-safe, domain-specific errors. */
function classifyYtDlpFailure(stderr: string): ApiError {
  const s = stderr.toLowerCase();
  if (/\bprivate (?:video|content|media)\b|\b(?:video|content|media|account) (?:is|was) private\b/.test(s)) {
    return new ApiError('PRIVATE_CONTENT', 'This media is private or requires an account. Only public content can be downloaded.');
  }
  // A public YouTube video can trigger "sign in to confirm you're not a bot"
  // on cloud hosts. This is a source challenge, not proof the video is private.
  if (/\b(?:not a bot|captcha|recaptcha)\b/.test(s)) {
    return new ApiError(
      'SOURCE_UNAVAILABLE',
      'The source requested bot verification for this server. The media may still be public; please try again later.',
    );
  }
  if (/\brate[ -]?limit|too many requests|\bhttp(?: error)?[: ]+429\b/.test(s)) {
    return new ApiError('SOURCE_UNAVAILABLE', 'The source platform is rate limiting requests. Please try again later.');
  }
  // Avoid matching "age" inside unrelated words such as "webpage" and "message".
  if (/\bdrm\b|\bage[ -](?:restricted|restriction|verification|gated)\b|\b(?:confirm|verify) (?:your )?age\b/.test(s)) {
    return new ApiError('CONTENT_UNAVAILABLE', 'This media is restricted and cannot be downloaded.');
  }
  if (/\b(?:login_required|sign[ -]?in|log[ -]?in)\b/.test(s)) {
    return new ApiError(
      'SOURCE_UNAVAILABLE',
      'The source asked this server to sign in. The media may be restricted, or the platform may be blocking a public link.',
    );
  }
  if (s.includes('not found') || s.includes('does not exist') || s.includes('unavailable') || s.includes('removed')) {
    return new ApiError('CONTENT_UNAVAILABLE', 'The media could not be found. It may have been removed by its owner.');
  }
  if (s.includes('unable to extract')) {
    return new ApiError(
      'SOURCE_UNAVAILABLE',
      'The media engine could not extract this content. The source may have changed or blocked this server; please try again later.',
    );
  }
  if (s.includes('unexpected response') || s.includes('please report this issue')) {
    return new ApiError(
      'SOURCE_UNAVAILABLE',
      'The source returned an unexpected response to the media engine. Please try again later.',
    );
  }
  if (
    s.includes('network') || s.includes('getaddrinfo') || s.includes('connection') ||
    s.includes('unable to download webpage') || /\bhttp(?: error)?[: ]+(?:403|5\d\d)\b/.test(s)
  ) {
    return new ApiError('SOURCE_UNAVAILABLE', 'Could not reach the source platform, or the request was blocked. Please try again later.');
  }
  return new ApiError('DOWNLOAD_FAILED', 'The media could not be processed.');
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
  '--socket-timeout',
  '20',
  '--retries',
  '2',
  ...(env.YTDLP_JS_RUNTIME ? ['--js-runtimes', env.YTDLP_JS_RUNTIME] : []),
];

/** Metadata-only analysis. */
export async function probeUrl(url: string, signal?: CancellationFlag): Promise<YtDlpInfo> {
  const out = await run(
    ['--dump-single-json', '--skip-download', ...COMMON_ARGS, url],
    60_000,
    signal,
  );
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
 * Download into a private work directory. Only a path reported by yt-dlp's
 * after_move hook is accepted; leftover video/audio fragments are not output.
 */
export async function downloadStreams(
  url: string,
  selector: string,
  outTemplate: string,
  onProgress: (p: StreamDownloadProgress) => void,
  signal: CancellationFlag,
): Promise<string> {
  const maxBytes = env.MAX_DOWNLOAD_SIZE_MB * 1024 * 1024;
  const workDir = path.dirname(outTemplate);
  const marker = 'FETCHLY_OUTPUT:';
  const args = [
    '-f', selector,
    '--newline',
    '--progress',
    '--no-simulate',
    '--no-part',
    '--merge-output-format', 'mp4',
    // This is a helpful early rejection for known stream sizes; the directory
    // monitor and final size check also cover unknown sizes and multistreams.
    '--max-filesize', String(maxBytes),
    '--print', `after_move:${marker}%(filepath)s`,
    // --print implies --quiet; undo it so size-skip messages are observable.
    '--no-quiet',
    ...COMMON_ARGS,
    ...(env.FFMPEG_PATH ? ['--ffmpeg-location', env.FFMPEG_PATH] : []),
    '-o', outTemplate,
    url,
  ];

  let outputPath: string | undefined;
  let skippedForSize = false;
  let lineBuffer = '';
  const handleLine = (line: string): void => {
    if (line.startsWith(marker)) {
      outputPath = line.slice(marker.length).trim();
      return;
    }
    if (/larger than (?:max-filesize|the maximum|maximum)/i.test(line)) skippedForSize = true;
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
    if (progress.totalBytes !== undefined) {
      progress.downloadedBytes = Math.round((progress.percent / 100) * progress.totalBytes);
    }
    onProgress(progress);
  };

  const result = await runGuarded(binary(), args, {
    timeoutMs: env.DOWNLOAD_TIMEOUT_SECONDS * 1000,
    timeoutMessage: 'The download took too long and was stopped.',
    unavailableMessage: 'The media engine is not installed on this server.',
    startErrorMessage: 'Download failed to start.',
    signal,
    checkLimit: () => assertWorkSize(workDir, maxBytes),
    captureStdout: false,
    onStdout: (chunk) => {
      lineBuffer += chunk;
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = (lines.pop() ?? '').slice(-64 * 1024);
      for (const line of lines) handleLine(line);
    },
  });
  if (lineBuffer) handleLine(lineBuffer);
  if (skippedForSize) {
    throw new ApiError('DOWNLOAD_FAILED', `The media exceeds the ${env.MAX_DOWNLOAD_SIZE_MB} MB size limit.`);
  }
  if (result.code !== 0) {
    logger.warn({ code: result.code, stderr: safeStderr(result.stderr) }, 'yt-dlp download failed');
    throw classifyYtDlpFailure(result.stderr);
  }
  if (!outputPath) {
    throw new ApiError('DOWNLOAD_FAILED', 'The source did not produce a complete downloadable file.');
  }

  const resolved = path.resolve(outputPath);
  if (path.dirname(resolved) !== path.resolve(workDir)) {
    throw new ApiError('DOWNLOAD_FAILED', 'The downloaded file had an invalid location.');
  }
  const stat = await fs.lstat(resolved).catch(() => null);
  if (!stat?.isFile() || stat.size === 0) {
    throw new ApiError('DOWNLOAD_FAILED', 'The downloaded file could not be read from storage.');
  }
  if (stat.size > maxBytes) {
    throw new ApiError('DOWNLOAD_FAILED', `The media exceeds the ${env.MAX_DOWNLOAD_SIZE_MB} MB size limit.`);
  }
  return resolved;
}
