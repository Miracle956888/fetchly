import { logger } from '../config/logger.js';
import type { AnalysisRecord, DownloadJobRecord, JobStatus } from '../types/index.js';
import type {
  AdminUser,
  CreateJobInput,
  Datastore,
  JobFilters,
  JobStats,
} from './datastore.js';

/**
 * MySQL persistence via Prisma. The client is imported dynamically so that a
 * missing generated client or unreachable database degrades gracefully at
 * boot instead of crashing the process.
 */

type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRaw<T = unknown>(q: TemplateStringsArray, ...args: unknown[]): Promise<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

const ACTIVE: JobStatus[] = ['QUEUED', 'ANALYZING', 'DOWNLOADING', 'PROCESSING'];

export async function createPrismaDatastore(databaseUrl: string): Promise<Datastore> {
  const mod = await import('@prisma/client');
  const client = new mod.PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: ['warn', 'error'],
  }) as PrismaClientLike;
  await client.$connect();
  await client.$queryRaw`SELECT 1`;

  const mapJob = (j: Record<string, unknown>): DownloadJobRecord => ({
    id: j.id as string,
    sourceUrl: j.sourceUrl as string,
    platform: j.platform as string,
    title: (j.title as string | null) ?? null,
    thumbnailUrl: (j.thumbnailUrl as string | null) ?? null,
    format: j.format as string,
    quality: j.quality as string,
    status: j.status as JobStatus,
    progress: j.progress as number,
    fileSize: j.fileSize == null ? null : Number(j.fileSize),
    fileName: (j.fileName as string | null) ?? null,
    filePath: (j.filePath as string | null) ?? null,
    downloadedBytes: j.downloadedBytes == null ? null : Number(j.downloadedBytes),
    speedBps: (j.speedBps as number | null) ?? null,
    deliveredAt: (j.deliveredAt as Date | null) ?? null,
    deliveryCount: (j.deliveryCount as number) ?? 0,
    errorCode: (j.errorCode as string | null) ?? null,
    errorMessage: (j.errorMessage as string | null) ?? null,
    createdAt: j.createdAt as Date,
    startedAt: (j.startedAt as Date | null) ?? null,
    completedAt: (j.completedAt as Date | null) ?? null,
    expiresAt: (j.expiresAt as Date | null) ?? null,
  });

  const analyses = new Map<string, AnalysisRecord>();

  const store: Datastore = {
    kind: 'mysql',

    async ping() {
      try {
        await client.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },

    async createJob(input: CreateJobInput) {
      const row = await client.downloadJob.create({
        data: {
          id: input.id,
          ipKey: input.ipKey,
          sourceUrl: input.sourceUrl,
          platform: input.platform,
          title: input.title,
          thumbnailUrl: input.thumbnailUrl,
          format: input.format,
          quality: input.quality,
          status: 'QUEUED',
          expiresAt: new Date(Date.now() + input.expiresMinutes * 60_000),
        },
      });
      return mapJob(row);
    },

    async updateJob(id, patch) {
      const data: Record<string, unknown> = { ...patch };
      if (patch.fileSize != null) data.fileSize = BigInt(patch.fileSize);
      if (patch.downloadedBytes != null) data.downloadedBytes = BigInt(patch.downloadedBytes);
      await client.downloadJob.update({ where: { id }, data });
    },

    async getJob(id) {
      const row = await client.downloadJob.findUnique({ where: { id } });
      return row ? mapJob(row) : null;
    },

    async deleteJob(id) {
      await client.downloadJob.delete({ where: { id } }).catch(() => undefined);
    },

    async listJobs(filters: JobFilters) {
      const where: Record<string, unknown> = {};
      if (filters.status) where.status = filters.status;
      if (filters.platform) where.platform = filters.platform;
      if (filters.search) where.title = { contains: filters.search };
      const [items, total] = await Promise.all([
        client.downloadJob.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: filters.limit ?? 25,
          skip: filters.offset ?? 0,
        }),
        client.downloadJob.count({ where }),
      ]);
      return { items: items.map(mapJob), total };
    },

    async countActiveJobsForIp(ipKey: string) {
      return client.downloadJob.count({ where: { ipKey, status: { in: ACTIVE } } });
    },

    async jobStats(): Promise<JobStats> {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const since14 = new Date(now.getTime() - 14 * 864e5);

      // All figures come from aggregate queries — records are not loaded into Node.
      const weekStart = new Date(now.getTime() - 7 * 864e5);
      const monthStart = new Date(now.getTime() - 30 * 864e5);
      const completedWhere = { status: 'COMPLETED' as const };
      const [
        total, today, week, month, completed, failed, active, processing,
        sizeAgg, sizeTodayAgg, sizeWeekAgg, sizeMonthAgg,
        deliveredCount, deliveredAgg, recent, byPlatform, byFormat,
      ] = await Promise.all([
          client.downloadJob.count(),
          client.downloadJob.count({ where: { createdAt: { gte: startOfDay } } }),
          client.downloadJob.count({ where: { createdAt: { gte: weekStart } } }),
          client.downloadJob.count({ where: { createdAt: { gte: monthStart } } }),
          client.downloadJob.count({ where: completedWhere }),
          client.downloadJob.count({ where: { status: 'FAILED' } }),
          client.downloadJob.count({ where: { status: { in: ['QUEUED', 'ANALYZING', 'DOWNLOADING'] } } }),
          client.downloadJob.count({ where: { status: 'PROCESSING' } }),
          client.downloadJob.aggregate({ _sum: { fileSize: true }, where: completedWhere }),
          client.downloadJob.aggregate({ _sum: { fileSize: true }, where: { ...completedWhere, createdAt: { gte: startOfDay } } }),
          client.downloadJob.aggregate({ _sum: { fileSize: true }, where: { ...completedWhere, createdAt: { gte: weekStart } } }),
          client.downloadJob.aggregate({ _sum: { fileSize: true }, where: { ...completedWhere, createdAt: { gte: monthStart } } }),
          client.downloadJob.count({ where: { deliveredAt: { not: null } } }),
          client.downloadJob.aggregate({ _sum: { fileSize: true }, where: { deliveredAt: { not: null } } }),
          client.downloadJob.findMany({
            where: { createdAt: { gte: since14 } },
            select: { createdAt: true, status: true },
          }),
          client.downloadJob.groupBy({ by: ['platform'], _count: { _all: true }, orderBy: { _count: { platform: 'desc' } } }),
          client.downloadJob.groupBy({ by: ['format'], _count: { _all: true } }),
        ]);

      const byDayMap = new Map<string, { date: string; total: number; completed: number; failed: number }>();
      for (let i = 13; i >= 0; i--) {
        const key = new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10);
        byDayMap.set(key, { date: key, total: 0, completed: 0, failed: 0 });
      }
      for (const r of recent) {
        const key = (r.createdAt as Date).toISOString().slice(0, 10);
        const day = byDayMap.get(key);
        if (!day) continue;
        day.total += 1;
        if (r.status === 'COMPLETED') day.completed += 1;
        if (r.status === 'FAILED') day.failed += 1;
      }

      return {
        total,
        today,
        week,
        month,
        completed,
        failed,
        active,
        processing,
        bytesProcessed: Number(sizeAgg._sum.fileSize ?? 0),
        bytesToday: Number(sizeTodayAgg._sum.fileSize ?? 0),
        bytesWeek: Number(sizeWeekAgg._sum.fileSize ?? 0),
        bytesMonth: Number(sizeMonthAgg._sum.fileSize ?? 0),
        filesDelivered: deliveredCount,
        bytesDelivered: Number(deliveredAgg._sum.fileSize ?? 0),
        byDay: [...byDayMap.values()],
        byPlatform: byPlatform.map((p: { platform: string; _count: { _all: number } }) => ({
          platform: p.platform,
          count: p._count._all,
        })),
        byFormat: byFormat.map((f: { format: string; _count: { _all: number } }) => ({
          format: f.format,
          count: f._count._all,
        })),
      };
    },

    async storageInfo() {
      const { fsStorageInfo } = await import('../services/storage.js');
      const fs = await fsStorageInfo();
      const expiredAwaitingCleanup = await client.downloadJob.count({
        where: { status: 'COMPLETED', expiresAt: { lt: new Date() } },
      });
      return { ...fs, expiredAwaitingCleanup };
    },

    async addEvent(jobId, eventType, message, metadata) {
      await client.downloadEvent
        .create({ data: { downloadJobId: jobId, eventType, message, metadata: metadata as object } })
        .catch((e: unknown) => logger.warn({ e }, 'Failed to persist job event'));
    },

    async listEvents(limit: number) {
      const rows = await client.downloadEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return rows.map((r: { id: string; downloadJobId: string; eventType: string; message: string | null; createdAt: Date }) => ({
        id: r.id,
        jobId: r.downloadJobId,
        eventType: r.eventType,
        message: r.message,
        createdAt: r.createdAt,
      }));
    },

    async getPlatformOverrides() {
      const rows = await client.platform.findMany();
      return Object.fromEntries(rows.map((r: { slug: string; enabled: boolean }) => [r.slug, r.enabled]));
    },

    async setPlatformEnabled(slug: string, enabled: boolean) {
      await client.platform.upsert({
        where: { slug },
        update: { enabled },
        create: { slug, name: slug, enabled },
      });
    },

    async getSettings() {
      const rows = await client.systemSetting.findMany();
      return Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value]));
    },

    async setSetting(key: string, value: string) {
      await client.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    },

    async track(eventType: string, platform?: string, metadata?: unknown) {
      await client.analyticsEvent
        .create({ data: { eventType, platform, metadata: metadata as object } })
        .catch(() => undefined);
    },

    async topAnalytics(limit: number) {
      const rows = await client.analyticsEvent.groupBy({
        by: ['eventType'],
        _count: { _all: true },
        orderBy: { _count: { eventType: 'desc' } },
        take: limit,
      });
      return rows.map((r: { eventType: string; _count: { _all: number } }) => ({
        eventType: r.eventType,
        count: r._count._all,
      }));
    },

    async ensureAdmin(name: string, email: string, passwordHash: string) {
      const existing = await client.user.findUnique({ where: { email } });
      if (existing) return;
      await client.user.create({
        data: { name, email, passwordHash, role: 'ADMIN', status: 'ACTIVE' },
      });
      logger.info({ email }, 'Seeded admin user (MySQL)');
    },

    async findByEmail(email: string) {
      const u = await client.user.findUnique({ where: { email } });
      if (!u) return null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      };
    },

    async listUsers(): Promise<AdminUser[]> {
      const rows = await client.user.findMany({ orderBy: { createdAt: 'desc' } });
      return rows.map((u: { id: string; name: string; email: string; role: string; status: string; createdAt: Date }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as AdminUser['role'],
        status: u.status as AdminUser['status'],
        createdAt: u.createdAt,
      }));
    },

    async saveAnalysis(record: AnalysisRecord) {
      analyses.set(record.id, record);
      setTimeout(() => analyses.delete(record.id), 60 * 60_000).unref?.();
    },

    async getAnalysis(id: string) {
      return analyses.get(id) ?? null;
    },
  };

  return store;
}
