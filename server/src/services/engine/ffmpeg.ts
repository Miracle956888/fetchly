import { spawn } from 'node:child_process';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/errors.js';
import { assertOutputSize } from '../storage.js';
import { runGuarded, type CancellationFlag } from './process.js';

/**
 * FFmpeg processing layer. All argument vectors are built from fixed,
 * server-controlled templates — user input can never inject arguments.
 * Prefer stream-copy/remux over re-encoding wherever possible.
 */

const binary = (): string => env.FFMPEG_PATH || 'ffmpeg';

async function run(args: string[], output: string, signal: CancellationFlag): Promise<void> {
  const result = await runGuarded(binary(), args, {
    timeoutMs: env.PROCESS_TIMEOUT_SECONDS * 1000,
    timeoutMessage: 'Media processing timed out.',
    unavailableMessage: 'FFmpeg is not installed on this server.',
    startErrorMessage: 'Media processing failed to start.',
    signal,
    checkLimit: () => assertOutputSize(output, env.MAX_DOWNLOAD_SIZE_MB * 1024 * 1024),
    captureStdout: false,
  });
  if (result.code !== 0) throw new ApiError('FFMPEG_FAILED', 'Media processing failed.');
}

/** Remux without re-encoding (cheap). Use when codecs are already compatible. */
export function remux(input: string, output: string, signal: CancellationFlag): Promise<void> {
  return run(['-hide_banner', '-nostdin', '-loglevel', 'error', '-y', '-i', input, '-c', 'copy', output], output, signal);
}

/** Extract + encode audio to MP3 at the given bitrate. */
export function toMp3(input: string, output: string, bitrateKbps: number, signal: CancellationFlag): Promise<void> {
  const kbps = [128, 192, 320].includes(bitrateKbps) ? bitrateKbps : 192;
  return run(
    [
      '-hide_banner', '-nostdin', '-loglevel', 'error', '-y',
      '-i', input,
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', `${kbps}k`,
      '-map_metadata', '0',
      output,
    ],
    output,
    signal,
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
