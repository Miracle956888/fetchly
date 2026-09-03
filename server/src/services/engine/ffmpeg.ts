import { spawn } from 'node:child_process';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/errors.js';

/**
 * FFmpeg processing layer. All argument vectors are built from fixed,
 * server-controlled templates — user input can never inject arguments.
 * Prefer stream-copy/remux over re-encoding wherever possible.
 */

const binary = (): string => env.FFMPEG_PATH || 'ffmpeg';

function run(args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new ApiError('TIMEOUT', 'Media processing timed out.'));
    }, timeoutMs);

    child.stderr.on('data', (d) => {
      stderr += d;
      if (stderr.length > 2 * 1024 * 1024) stderr = stderr.slice(-256 * 1024);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new ApiError('ENGINE_UNAVAILABLE', 'FFmpeg is not installed on this server.'));
      } else {
        reject(new ApiError('FFMPEG_FAILED', 'Media processing failed to start.'));
      }
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve();
      reject(new ApiError('FFMPEG_FAILED', 'Media processing failed.'));
    });
  });
}

/** Remux without re-encoding (cheap). Use when codecs are already compatible. */
export function remux(input: string, output: string): Promise<void> {
  return run(['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-c', 'copy', output], 10 * 60_000);
}

/** Extract + encode audio to MP3 at the given bitrate. */
export function toMp3(input: string, output: string, bitrateKbps: number): Promise<void> {
  const kbps = [128, 192, 320].includes(bitrateKbps) ? bitrateKbps : 192;
  return run(
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', input,
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', `${kbps}k`,
      '-map_metadata', '0',
      output,
    ],
    30 * 60_000,
  );
}

export async function checkAvailable(): Promise<{ available: boolean; version: string | null }> {
  return new Promise((resolve) => {
    const child = spawn(binary(), ['-version'], { stdio: ['ignore', 'pipe', 'ignore'] });
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
      resolve({ available: code === 0, version: code === 0 ? out.split('\n')[0] ?? null : null });
    });
  });
}
