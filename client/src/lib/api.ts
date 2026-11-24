import type {
  AdminJobStats,
  AnalysisResult,
  JobStatusResponse,
  PlatformInfo,
} from '../types';

/**
 * API client. All requests are relative so the same build works behind any
 * reverse proxy (dev: Vite proxy, prod: Nginx). No API origin is hardcoded.
 */
export class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * API origin. Empty by default so requests stay relative and the same build
 * works behind any reverse proxy (dev: Vite proxy, prod: Nginx). For hosts
 * where the API lives on another origin (e.g. cPanel subdomains), build the
 * client with VITE_API_ORIGIN=https://api.yourdomain.com.
 */
const API_ORIGIN: string = import.meta.env.VITE_API_ORIGIN ?? '';
const BASE = `${API_ORIGIN}/api/v1`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    // Request cancellation is control flow, not an error.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiClientError('NETWORK', 'Could not reach the server. Check your connection and try again.', 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiClientError(
      err?.code ?? 'SERVER_ERROR',
      friendlyMessage(err?.code, err?.message),
      res.status,
    );
  }
  return (body as { success: boolean; data: T }).data;
}

/** Translate technical codes into understandable copy; never show raw internals. */
function friendlyMessage(code?: string, fallback?: string): string {
  if (fallback) return fallback;
  switch (code) {
    case 'NETWORK':
      return 'Could not reach the server. Check your connection and try again.';
    case 'INVALID_URL':
      return 'That does not look like a valid link. Paste the full URL and try again.';
    case 'UNSUPPORTED_PLATFORM':
      return 'This platform is not supported yet.';
    case 'PRIVATE_CONTENT':
      return 'This media is private. Only public content can be downloaded.';
    case 'CONTENT_UNAVAILABLE':
      return 'This media is unavailable. It may have been removed.';
    case 'RATE_LIMITED':
      return 'You are going a bit too fast. Please wait a moment and try again.';
    case 'ENGINE_UNAVAILABLE':
      return 'The media engine is temporarily unavailable. Please try again later.';
    case 'TIMEOUT':
      return 'The request took too long. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export const api = {
  analyze: (url: string, signal?: AbortSignal) =>
    request<AnalysisResult>('/media/analyze', { method: 'POST', body: JSON.stringify({ url }), signal }),

  createDownload: (analysisId: string, format: string, quality: string) =>
    request<{ jobId: string; status: string }>('/downloads', {
      method: 'POST',
      body: JSON.stringify({ analysisId, format, quality }),
    }),

  jobStatus: (jobId: string) => request<JobStatusResponse>(`/downloads/${jobId}`),

  /** Best-effort, allow-listed client delivery events (never trusted for sizes). */
  reportDownloadEvent: (jobId: string, type: 'download_started') =>
    request<{ success: boolean }>(`/downloads/${jobId}/events`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }).catch(() => undefined),

  cancelJob: (jobId: string) =>
    request<{ jobId: string; status: string }>(`/downloads/${jobId}`, { method: 'DELETE' }),

  removeJob: (jobId: string) =>
    request<{ success: boolean }>(`/downloads/${jobId}/record`, { method: 'DELETE' }),

  fileUrl: (jobId: string) => `${BASE}/downloads/${jobId}/file`,

  platforms: () => request<PlatformInfo[]>('/platforms'),
};

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ email: string; name: string }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ success: boolean }>('/admin/auth/logout', { method: 'POST' }),
  me: () => request<{ email: string }>('/admin/auth/me'),
  stats: () => request<AdminJobStats>('/admin/stats'),
  storage: () =>
    request<{ usedBytes: number; freeBytes: number; fileCount: number; expiredAwaitingCleanup: number }>(
      '/admin/storage',
    ),
  jobs: (params: { status?: string; platform?: string; search?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.platform) qs.set('platform', params.platform);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', String(params.page));
    return request<{
      items: Array<Record<string, unknown> & { id: string; status: string }>;
      total: number;
      page: number;
      pageSize: number;
    }>(`/admin/jobs?${qs.toString()}`);
  },
  cancelJob: (id: string) => request(`/admin/jobs/${id}/cancel`, { method: 'POST' }),
  retryJob: (id: string) => request(`/admin/jobs/${id}/retry`, { method: 'POST' }),
  deleteJob: (id: string) => request(`/admin/jobs/${id}`, { method: 'DELETE' }),
  platforms: () => request<PlatformInfo[]>('/admin/platforms'),
  setPlatform: (slug: string, enabled: boolean) =>
    request<PlatformInfo[]>(`/admin/platforms/${slug}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),
  users: () =>
    request<Array<{ id: string; name: string; email: string; role: string; status: string; createdAt: string }>>(
      '/admin/users',
    ),
  settings: () => request<Record<string, string>>('/admin/settings'),
  saveSettings: (settings: Record<string, string>) =>
    request<Record<string, string>>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  analytics: () => request<Array<{ eventType: string; count: number }>>('/admin/analytics'),
  events: (limit = 100) =>
    request<Array<{ id: string; jobId: string; eventType: string; message: string | null; createdAt: string }>>(
      `/admin/events?limit=${limit}`,
    ),
  system: () =>
    request<{
      node: string;
      uptimeSec: number;
      memoryMb: number;
      persistence: string;
      database: string;
      redis: string;
      ffmpeg: { available: boolean; version: string | null };
      engine: { available: boolean; version: string | null };
      limits: Record<string, number>;
    }>('/admin/system'),
};
