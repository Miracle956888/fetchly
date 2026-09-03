import { logger } from '../config/logger.js';
import { fsStorageInfo } from '../services/storage.js';
import type { AnalysisRecord, DownloadJobRecord, JobStatus } from '../types/index.js';
import type {
  AdminUser,
  CreateJobInput,
  Datastore,
  JobFilters,
  JobStats,
  StorageInfo,
} from './datastore.js';

/**
 * In-process persistence for local development without MySQL. Selected
 * automatically when DATABASE_URL is not configured; boot logging makes the
 * mode impossible to miss. Never use this in production.
 */

interface JobRow extends DownloadJobRecord {
  ipKey: string | null;
}
interface EventRow {
  id: string;
  jobId: string;
  eventType: string;
  message: string | null;
  createdAt: Date;
}
interface UserRow extends AdminUser {
  passwordHash: string;
}

let seq = 0;
const uid = (): string => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

export class MemoryDatastore implements Datastore {
  readonly kind = 'memory' as const;

  private jobs = new Map<string, JobRow>();
  private events: EventRow[] = [];
  private platformOverrides = new Map<string, boolean>();
  private settings = new Map<string, string>();
  private analytics = new Map<string, { eventType: string; platform?: string; createdAt: Date }>();
  private users = new Map<string, UserRow>();
  private analyses = new Map<string, AnalysisRecord>();

  async ping(): Promise<boolean> {
    return true;
  }

  async createJob(input: CreateJobInput): Promise<DownloadJobRecord> {
    const now = new Date();
    const row: JobRow = {
      id: input.id,
      ipKey: input.ipKey,
      sourceUrl: input.sourceUrl,
      platform: input.platform,
      title: input.title,
      thumbnailUrl: input.thumbnailUrl,
      format: input.format,
      quality: input.quality,
      status: 'QUEUED',
      progress: 0,
      fileSize: null,
      fileName: null,
      filePath: null,
      downloadedBytes: null,
      speedBps: null,
      deliveredAt: null,
      deliveryCount: 0,
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      expiresAt: new Date(now.getTime() + input.expiresMinutes * 60_000),
    };
    this.jobs.set(row.id, row);
    return { ...row };
  }

  async updateJob(id: string, patch: Partial<JobRow>): Promise<void> {
    const row = this.jobs.get(id);
    if (!row) return;
    Object.assign(row, patch);
  }

  async getJob(id: string): Promise<DownloadJobRecord | null> {
    const row = this.jobs.get(id);
    return row ? { ...row } : null;
  }

  async deleteJob(id: string): Promise<void> {
    this.jobs.delete(id);
    this.events = this.events.filter((e) => e.jobId !== id);
  }

  async listJobs(filters: JobFilters): Promise<{ items: DownloadJobRecord[]; total: number }> {
    let rows = [...this.jobs.values()];
    if (filters.status) rows = rows.filter((r) => r.status === filters.status);
    if (filters.platform) rows = rows.filter((r) => r.platform === filters.platform);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) => (r.title ?? '').toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = rows.length;
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 25;
    return { items: rows.slice(offset, offset + limit).map((r) => ({ ...r })), total };
  }

  async countActiveJobsForIp(ipKey: string): Promise<number> {
    const active: JobStatus[] = ['QUEUED', 'ANALYZING', 'DOWNLOADING', 'PROCESSING'];
    return [...this.jobs.values()].filter((r) => r.ipKey === ipKey && active.includes(r.status))
      .length;
  }

  async jobStats(): Promise<JobStats> {
    const rows = [...this.jobs.values()];
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = now.getTime() - 7 * 864e5;
    const monthAgo = now.getTime() - 30 * 864e5;
    const active: JobStatus[] = ['QUEUED', 'ANALYZING', 'DOWNLOADING'];

    const byDayMap = new Map<string, { date: string; total: number; completed: number; failed: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 864e5);
      const key = d.toISOString().slice(0, 10);
      byDayMap.set(key, { date: key, total: 0, completed: 0, failed: 0 });
    }
    const byPlatformMap = new Map<string, number>();
    const byFormatMap = new Map<string, number>();

    let completed = 0;
    let failed = 0;
    let bytes = 0;
    let bytesToday = 0;
    let bytesWeek = 0;
    let bytesMonth = 0;
    let filesDelivered = 0;
    let bytesDelivered = 0;
    for (const r of rows) {
      const t = r.createdAt.getTime();
      const key = r.createdAt.toISOString().slice(0, 10);
      const day = byDayMap.get(key);
      if (day) {
        day.total += 1;
        if (r.status === 'COMPLETED') day.completed += 1;
        if (r.status === 'FAILED') day.failed += 1;
      }
      if (r.status === 'COMPLETED') completed += 1;
      if (r.status === 'FAILED') failed += 1;
      if (r.fileSize && r.status === 'COMPLETED') {
        bytes += r.fileSize;
        if (r.createdAt >= startOfDay) bytesToday += r.fileSize;
        if (t >= weekAgo) bytesWeek += r.fileSize;
        if (t >= monthAgo) bytesMonth += r.fileSize;
      }
      if (r.deliveredAt) {
        filesDelivered += 1;
        if (r.fileSize) bytesDelivered += r.fileSize;
      }
      byPlatformMap.set(r.platform, (byPlatformMap.get(r.platform) ?? 0) + 1);
      byFormatMap.set(r.format, (byFormatMap.get(r.format) ?? 0) + 1);
    }

    return {
      total: rows.length,
      today: rows.filter((r) => r.createdAt >= startOfDay).length,
      week: rows.filter((r) => r.createdAt.getTime() >= weekAgo).length,
      month: rows.filter((r) => r.createdAt.getTime() >= monthAgo).length,
      completed,
      failed,
      active: rows.filter((r) => active.includes(r.status)).length,
      processing: rows.filter((r) => r.status === 'PROCESSING').length,
      bytesProcessed: bytes,
      bytesToday,
      bytesWeek,
      bytesMonth,
      filesDelivered,
      bytesDelivered,
      byDay: [...byDayMap.values()],
      byPlatform: [...byPlatformMap.entries()]
        .map(([platform, count]) => ({ platform, count }))
        .sort((a, b) => b.count - a.count),
      byFormat: [...byFormatMap.entries()].map(([format, count]) => ({ format, count })),
    };
  }

  async storageInfo(): Promise<StorageInfo> {
    const fs = await fsStorageInfo();
    const now = Date.now();
    const expiredAwaitingCleanup = [...this.jobs.values()].filter(
      (r) => r.status === 'COMPLETED' && r.expiresAt && r.expiresAt.getTime() < now,
    ).length;
    return { ...fs, expiredAwaitingCleanup };
  }

  async addEvent(jobId: string, eventType: string, message?: string): Promise<void> {
    this.events.push({ id: uid(), jobId, eventType, message: message ?? null, createdAt: new Date() });
    if (this.events.length > 2000) this.events = this.events.slice(-2000);
  }

  async listEvents(limit: number): Promise<EventRow[]> {
    return [...this.events].reverse().slice(0, limit);
  }

  async getPlatformOverrides(): Promise<Record<string, boolean>> {
    return Object.fromEntries(this.platformOverrides);
  }

  async setPlatformEnabled(slug: string, enabled: boolean): Promise<void> {
    this.platformOverrides.set(slug, enabled);
  }

  async getSettings(): Promise<Record<string, string>> {
    return Object.fromEntries(this.settings);
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.settings.set(key, value);
  }

  async track(eventType: string, platform?: string): Promise<void> {
    const id = uid();
    this.analytics.set(id, { eventType, platform, createdAt: new Date() });
    if (this.analytics.size > 5000) {
      const first = this.analytics.keys().next().value;
      if (first) this.analytics.delete(first);
    }
  }

  async topAnalytics(limit: number): Promise<Array<{ eventType: string; count: number }>> {
    const counts = new Map<string, number>();
    for (const ev of this.analytics.values()) {
      counts.set(ev.eventType, (counts.get(ev.eventType) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async ensureAdmin(name: string, email: string, passwordHash: string): Promise<void> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return;
    }
    this.users.set(email, {
      id: uid(),
      name,
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
    });
    logger.info({ email }, 'Seeded admin user (memory datastore)');
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return { ...u };
    }
    return null;
  }

  async listUsers(): Promise<AdminUser[]> {
    return [...this.users.values()].map(({ passwordHash: _ph, ...rest }) => rest);
  }

  async saveAnalysis(record: AnalysisRecord): Promise<void> {
    this.analyses.set(record.id, record);
  }

  async getAnalysis(id: string): Promise<AnalysisRecord | null> {
    return this.analyses.get(id) ?? null;
  }
}
