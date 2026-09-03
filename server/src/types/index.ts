export type MediaKind = 'video' | 'audio';

export interface FormatOption {
  /** Stable id for this option within one analysis result. */
  id: string;
  kind: MediaKind;
  /** Container of the delivered file, e.g. mp4, mp3. */
  container: 'mp4' | 'mp3' | 'webm' | 'm4a';
  /** Human label, e.g. "1080p" or "320 kbps". */
  quality: string;
  /** Vertical resolution for video, bitrate for audio. */
  height?: number;
  bitrate?: number;
  /** Estimated size in bytes when the source reports it. */
  estimatedSize?: number;
  /** True when the option requires FFmpeg conversion/remuxing. */
  converted: boolean;
}

export interface MediaInfo {
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
  | 'QUEUED'
  | 'ANALYZING'
  | 'DOWNLOADING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface DownloadJobRecord {
  id: string;
  sourceUrl: string;
  platform: string;
  title: string | null;
  thumbnailUrl: string | null;
  format: string;
  quality: string;
  status: JobStatus;
  progress: number;
  fileSize: number | null;
  fileName: string | null;
  filePath: string | null;
  downloadedBytes: number | null;
  speedBps: number | null;
  deliveredAt: Date | null;
  deliveryCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
}

export interface PlatformInfo {
  slug: string;
  name: string;
  enabled: boolean;
  implemented: boolean;
}

export interface AnalysisRecord {
  id: string;
  url: string;
  info: MediaInfo;
  /** Server-side execution plans keyed by format option id. */
  plans: Record<string, import('../providers/types.js').FormatPlan>;
  createdAt: Date;
}
