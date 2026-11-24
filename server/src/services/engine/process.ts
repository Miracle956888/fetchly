import { spawn, type ChildProcess } from 'node:child_process';
import { ApiError } from '../../utils/errors.js';

/** Shared cooperative cancellation flag for the stages of one download. */
export interface CancellationFlag {
  cancelled: boolean;
}

interface GuardedProcessOptions {
  timeoutMs: number;
  timeoutMessage: string;
  unavailableMessage: string;
  startErrorMessage: string;
  signal?: CancellationFlag;
  /** Isolate subprocess temp files so callers can remove them after a kill. */
  temporaryDirectory?: string;
  // A throwing check aborts the entire process group, not just the parent.
  checkLimit?: () => Promise<void>;
  onStdout?: (text: string) => void;
  captureStdout?: boolean;
}

export interface ProcessResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export function cancelledError(): ApiError {
  return new ApiError('DOWNLOAD_FAILED', 'Cancelled.');
}

function killProcessGroup(child: ChildProcess): void {
  // yt-dlp can launch FFmpeg. On Linux, kill its whole group before cleanup so
  // a descendant cannot keep writing an abandoned file after the parent exits.
  if (child.pid && process.platform !== 'win32') {
    try {
      process.kill(-child.pid, 'SIGKILL');
      return;
    } catch {
      // The process may already have exited; fall back to its direct handle.
    }
  }
  child.kill('SIGKILL');
}

/**
 * No shell is involved. Time, cancellation and optional file-size checks are
 * enforced while a process runs. Size checks are sampled, not a hard byte cap.
 * We wait for 'close' after killing before callers remove temporary files.
 */
export function runGuarded(
  binary: string,
  args: string[],
  options: GuardedProcessOptions,
): Promise<ProcessResult> {
  if (options.signal?.cancelled) return Promise.reject(cancelledError());

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      env: options.temporaryDirectory
        ? {
            ...process.env,
            TMPDIR: options.temporaryDirectory,
            ...(process.platform === 'win32' ? { TEMP: options.temporaryDirectory, TMP: options.temporaryDirectory } : {}),
          }
        : process.env,
    });
    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let reason: ApiError | undefined;
    let startError: NodeJS.ErrnoException | undefined;
    let closed = false;
    let checkInFlight: Promise<void> | undefined;

    const stop = (error: ApiError): void => {
      if (reason) return;
      reason = error;
      if (!closed) killProcessGroup(child);
    };

    const checkLimit = (): Promise<void> => {
      if (!options.checkLimit || reason) return Promise.resolve();
      if (!checkInFlight) {
        checkInFlight = options.checkLimit().catch((err: unknown) => {
          stop(err instanceof ApiError ? err : new ApiError('DOWNLOAD_FAILED', 'Could not check temporary storage.'));
        }).finally(() => {
          checkInFlight = undefined;
        });
      }
      return checkInFlight;
    };

    const timeout = setTimeout(
      () => stop(new ApiError('TIMEOUT', options.timeoutMessage)),
      options.timeoutMs,
    );
    const monitor = setInterval(() => {
      if (options.signal?.cancelled) stop(cancelledError());
      else void checkLimit();
    }, 500);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (options.captureStdout !== false) {
        stdoutBytes += chunk.length;
        if (stdoutBytes > 25 * 1024 * 1024) {
          stop(new ApiError('SERVER_ERROR', 'Engine output exceeded limits.'));
          return;
        }
        stdout += text;
      }
      options.onStdout?.(text);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      // Preserve useful diagnostic output without allowing unlimited memory use.
      stderr = (stderr + chunk.toString()).slice(-64 * 1024);
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      startError = err;
    });
    child.on('close', (code) => {
      closed = true;
      clearTimeout(timeout);
      clearInterval(monitor);
      void (async () => {
        if (checkInFlight) await checkInFlight;
        if (!reason && options.signal?.cancelled) reason = cancelledError();
        // A fast transfer can finish between samples; inspect its final files too.
        if (!reason) await checkLimit();
        if (reason) return reject(reason);
        if (startError) {
          return reject(
            startError.code === 'ENOENT'
              ? new ApiError('ENGINE_UNAVAILABLE', options.unavailableMessage)
              : new ApiError('DOWNLOAD_FAILED', options.startErrorMessage),
          );
        }
        return resolve({ code, stdout, stderr });
      })().catch(reject);
    });
  });
}
