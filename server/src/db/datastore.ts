import type {
  AnalysisRecord,
  DownloadJobRecord,
  JobStatus,
} from '../types/index.js';

/**
 * Persistence boundary. Two adapters implement this interface:
 *  - PrismaDatastore: MySQL via Prisma (production)
 *  - MemoryDatastore: in-process store (local dev without MySQL; logged loudly)
 * The rest of the codebase only ever sees this interface.
 */

export interface CreateJobInput {
  id: string;
  ipKey: string | null;
  sourceUrl: string;
  platform: string;
  title: string | null;
  thumbnailUrl: string | null;
  format: string;
  quality: string;
  expiresMinutes: number;
}

export interface JobFilters {
  status?: JobStatus;
  platform?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface JobStats {
  total: number;
  today: number;
  week: number;
  month: number;
  completed: number;
  failed: number;
  active: number;
  processing: number;
  /** SUM(file_size_bytes) of completed jobs — files generated. */
  bytesProcessed: number;
  bytesToday: number;
  bytesWeek: number;
  bytesMonth: number;
  /** Jobs whose generated file was actually requested by a user. */
  filesDelivered: number;
  /** SUM(file_size_bytes) over delivered jobs — data delivered. */
  bytesDelivered: number;
  byDay: Array<{ date: string; total: number; completed: number; failed: number }>;
  byPlatform: Array<{ platform: string; count: number }>;
  byFormat: Array<{ format: string; count: number }>;
}

export interface StorageInfo {
  usedBytes: number;
  freeBytes: number;
  fileCount: number;
  expiredAwaitingCleanup: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'DISABLED';
  createdAt: Date;
}

export interface Datastore {
  readonly kind: 'mysql' | 'memory';
  ping(): Promise<boolean>;

  // Jobs
  createJob(input: CreateJobInput): Promise<DownloadJobRecord>;
  updateJob(
    id: string,
    patch: Partial<
      Pick<
        DownloadJobRecord,
        | 'status'
        | 'progress'
        | 'fileSize'
        | 'fileName'
        | 'filePath'
        | 'downloadedBytes'
        | 'speedBps'
        | 'deliveredAt'
        | 'deliveryCount'
        | 'errorCode'
        | 'errorMessage'
        | 'startedAt'
        | 'completedAt'
        | 'expiresAt'
      >
    >,
  ): Promise<void>;
  getJob(id: string): Promise<DownloadJobRecord | null>;
  deleteJob(id: string): Promise<void>;
  listJobs(filters: JobFilters): Promise<{ items: DownloadJobRecord[]; total: number }>;
  countActiveJobsForIp(ipKey: string): Promise<number>;
  jobStats(): Promise<JobStats>;
  /** Temporary-storage usage snapshot for the admin dashboard. */
  storageInfo(): Promise<StorageInfo>;

  // Job event log (also powers the admin Logs page)
  addEvent(jobId: string, eventType: string, message?: string, metadata?: unknown): Promise<void>;
  listEvents(limit: number): Promise<
    Array<{ id: string; jobId: string; eventType: string; message: string | null; createdAt: Date }>
  >;

  // Platforms (enabled/disabled overrides managed from the admin UI)
  getPlatformOverrides(): Promise<Record<string, boolean>>;
  setPlatformEnabled(slug: string, enabled: boolean): Promise<void>;

  // System settings
  getSettings(): Promise<Record<string, string>>;
  setSetting(key: string, value: string): Promise<void>;

  // Analytics
  track(eventType: string, platform?: string, metadata?: unknown): Promise<void>;
  topAnalytics(limit: number): Promise<Array<{ eventType: string; count: number }>>;

  // Users / admin
  ensureAdmin(name: string, email: string, passwordHash: string): Promise<void>;
  findByEmail(email: string): Promise<(AdminUser & { passwordHash: string }) | null>;
  listUsers(): Promise<AdminUser[]>;

  // Analyses (short-lived cache; TTL enforced by caller)
  saveAnalysis(record: AnalysisRecord): Promise<void>;
  getAnalysis(id: string): Promise<AnalysisRecord | null>;
}
