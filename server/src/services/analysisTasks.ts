import { randomUUID } from 'node:crypto';
import { logger } from '../config/logger.js';
import type { AnalysisRecord } from '../types/index.js';
import { ApiError } from '../utils/errors.js';
import { analyzeUrl } from './analyzeService.js';
import type { CancellationFlag } from './engine/process.js';

/**
 * Bounded, disposable analysis tasks for hosts that require a quick response.
 * Results belong to this process and disappear on restart, just like the
 * beta's existing in-memory analysis cache and download queue.
 */
const TASK_TTL_MS = 5 * 60_000;
const MAX_TASKS = 100;

type TaskState =
  | { status: 'pending' }
  | { status: 'ready'; record: AnalysisRecord }
  | { status: 'failed'; error: ApiError };

interface Task {
  state: TaskState;
  signal: CancellationFlag;
  expiresAt: number;
}

const tasks = new Map<string, Task>();

function prune(): void {
  const now = Date.now();
  for (const [id, task] of tasks) {
    if (task.expiresAt <= now) {
      task.signal.cancelled = true;
      tasks.delete(id);
    }
  }
}

export function startAnalysisTask(url: string): { taskId: string; completion: Promise<void> } {
  prune();
  if (tasks.size >= MAX_TASKS) {
    throw new ApiError('JOB_LIMIT_REACHED', 'The server is busy analyzing links. Please try again shortly.');
  }

  const taskId = randomUUID();
  const task: Task = { state: { status: 'pending' }, signal: { cancelled: false }, expiresAt: Date.now() + TASK_TTL_MS };
  tasks.set(taskId, task);

  // Resolve even on failure: Netlify waitUntil can safely track this promise.
  const completion = analyzeUrl(url, task.signal).then((record) => {
    if (tasks.get(taskId) !== task || task.signal.cancelled) return;
    task.state = { status: 'ready', record };
    task.expiresAt = Date.now() + TASK_TTL_MS;
  }).catch((err: unknown) => {
    if (tasks.get(taskId) !== task || task.signal.cancelled) return;
    if (!(err instanceof ApiError)) logger.error({ err }, 'Asynchronous analysis failed');
    task.state = {
      status: 'failed',
      error: err instanceof ApiError ? err : new ApiError('SERVER_ERROR', 'Something went wrong on our side. Please try again.'),
    };
    task.expiresAt = Date.now() + TASK_TTL_MS;
  });

  return { taskId, completion };
}

export function getAnalysisTask(taskId: string): TaskState {
  prune();
  const task = tasks.get(taskId);
  if (!task) throw ApiError.notFound('This analysis request expired. Please try again.');
  return task.state;
}

export function cancelAnalysisTask(taskId: string): void {
  const task = tasks.get(taskId);
  if (!task) return;
  task.signal.cancelled = true;
  tasks.delete(taskId);
}
