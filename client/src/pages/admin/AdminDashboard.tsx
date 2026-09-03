import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  Download,
  HardDrive,
  Loader2,
  Send,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import { formatFileSize } from '../../utils/format';
import { BarChart, DonutChart, HBarList } from '../../components/admin/charts';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/States';

export default function AdminDashboard() {
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats });
  const storageInfo = useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: adminApi.storage,
    refetchInterval: 30_000,
  });

  if (stats.isPending) return <LoadingState label="Loading dashboard" />;
  if (stats.isError || !stats.data) return <p className="text-sm text-danger">Failed to load stats.</p>;
  const s = stats.data;
  const successRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 100;
  const mp4Count = s.byFormat.find((f) => f.format === 'mp4')?.count ?? 0;
  const mp3Count = s.byFormat.find((f) => f.format === 'mp3')?.count ?? 0;
  const st = storageInfo.data;
  const totalDisk = st ? st.usedBytes + st.freeBytes : 0;
  const diskUsagePct = st && totalDisk > 0 ? Math.round((st.usedBytes / totalDisk) * 100) : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink-soft">Live numbers from the job store — nothing is estimated or faked.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Download className="size-4.5" />} label="Downloads Today" value={String(s.today)} />
        <StatCard icon={<TrendingUp className="size-4.5" />} label="This Week" value={String(s.week)} />
        <StatCard icon={<Activity className="size-4.5" />} label="This Month" value={String(s.month)} />
        <StatCard icon={<CheckCircle2 className="size-4.5" />} label="Success Rate" value={`${successRate}%`} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Download className="size-4.5" />} label="Total Downloads" value={String(s.total)} subtle />
        <StatCard icon={<HardDrive className="size-4.5" />} label="Data Processed" value={formatFileSize(s.bytesProcessed)} subtle />
        <StatCard icon={<Send className="size-4.5" />} label="Data Delivered" value={formatFileSize(s.bytesDelivered)} subtle />
        <StatCard icon={<CheckCircle2 className="size-4.5" />} label="Files Delivered" value={String(s.filesDelivered)} subtle />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Activity className="size-4.5" />} label="Data Today" value={formatFileSize(s.bytesToday)} subtle />
        <StatCard icon={<Activity className="size-4.5" />} label="Data This Week" value={formatFileSize(s.bytesWeek)} subtle />
        <StatCard icon={<Activity className="size-4.5" />} label="Data This Month" value={formatFileSize(s.bytesMonth)} subtle />
        <StatCard icon={<Loader2 className="size-4.5" />} label="MP4 / MP3 Jobs" value={`${mp4Count} / ${mp3Count}`} subtle />
      </div>

      {st && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink">Temporary storage</h2>
            {diskUsagePct >= 80 && (
              <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-bold text-warning">
                Storage nearly full
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StorageStat label="Used" value={formatFileSize(st.usedBytes)} />
            <StorageStat label="Available" value={formatFileSize(st.freeBytes)} />
            <StorageStat label="Files" value={String(st.fileCount)} />
            <StorageStat label="Expired, awaiting cleanup" value={String(st.expiredAwaitingCleanup)} />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-line/60" aria-hidden="true">
            <div
              className={`h-full rounded-full ${diskUsagePct >= 80 ? 'bg-warning' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, diskUsagePct)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-soft">{diskUsagePct}% of the storage volume in use.</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-bold text-ink">Downloads over time</h2>
          <BarChart data={s.byDay} />
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 font-bold text-ink">Formats</h2>
            <DonutChart
              data={s.byFormat.map((f) => ({
                label: f.format,
                value: f.count,
                color: f.format === 'mp4' ? '#00C9A7' : 'var(--sf-ink)',
              }))}
            />
          </Card>
          <Card>
            <h2 className="mb-3 font-bold text-ink">Outcome</h2>
            <div className="flex items-center gap-6 text-sm">
              <p className="inline-flex items-center gap-1.5 font-medium text-success">
                <CheckCircle2 className="size-4" aria-hidden="true" /> {s.completed} succeeded
              </p>
              <p className="inline-flex items-center gap-1.5 font-medium text-danger">
                <XCircle className="size-4" aria-hidden="true" /> {s.failed} failed
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Card className="max-w-xl">
        <h2 className="mb-4 font-bold text-ink">Top platforms</h2>
        <HBarList data={s.byPlatform.map((p) => ({ label: p.platform, value: p.count }))} />
      </Card>
    </div>
  );
}

function StorageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-0.5 truncate text-lg font-extrabold tabular-nums text-ink">{value}</p>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  subtle = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
            subtle ? 'bg-surface text-ink-soft' : 'bg-primary-light text-primary-dark'
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
          <p className="truncate text-xl font-extrabold tabular-nums text-ink">{value}</p>
        </div>
      </div>
    </Card>
  );
}
