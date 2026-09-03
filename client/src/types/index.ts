export type MediaKind = 'video' | 'audio';

export interface FormatOption {
  id: string;
  kind: MediaKind;
  container: 'mp4' | 'mp3' | 'webm' | 'm4a';
  quality: string;
  height?: number;
  bitrate?: number;
  estimatedSize?: number;
  converted: boolean;
}

export interface AnalysisResult {
  id: string;
  platform: string;
  title: string;
  duration: number | null;
  thumbnail: string | null;
  uploader: string | null;
  webpageUrl: string;
  formats: FormatOption[];
}

export type JobStatus =
  | 'queued'
  | 'analyzing'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  progress: number;
  platform: string;
  title: string | null;
  format: string;
  quality: string;
  /** Canonical size in bytes — the server's filesystem truth. */
  fileSize: number | null;
  fileName: string | null;
  /** Live transfer telemetry from the engine. */
  downloadedBytes: number | null;
  speedBps: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  /** Signed, short-lived delivery URL — null until the file is ready. */
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PlatformInfo {
  slug: string;
  name: string;
  enabled: boolean;
  implemented: boolean;
}

export interface ApiErrorCode {
  code: string;
  message: string;
}

/** Locally tracked download (session download manager). */
export interface TrackedDownload {
  jobId: string;
  title: string;
  platform: string;
  format: string;
  quality: string;
  thumbnail: string | null;
  sourceUrl: string;
  createdAt: number;
}

export interface AdminJobStats {
  total: number;
  today: number;
  week: number;
  month: number;
  completed: number;
  failed: number;
  active: number;
  processing: number;
  bytesProcessed: number;
  bytesToday: number;
  bytesWeek: number;
  bytesMonth: number;
  filesDelivered: number;
  bytesDelivered: number;
  byDay: Array<{ date: string; total: number; completed: number; failed: number }>;
  byPlatform: Array<{ platform: string; count: number }>;
  byFormat: Array<{ format: string; count: number }>;
}
