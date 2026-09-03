import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/States';
import { adminApi } from '../../lib/api';
import { formatBytes, formatDate } from '../../utils/format';

const STATUSES = ['QUEUED', 'ANALYZING', 'DOWNLOADING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'] as const;

const STATUS_TONE: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  QUEUED: 'neutral',
  ANALYZING: 'primary',
  DOWNLOADING: 'primary',
  PROCESSING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
};

interface JobRow {
  id: string;
  title: string | null;
  platform: string;
  format: string;
  quality: string;
  status: (typeof STATUSES)[number];
  progress: number;
  fileSize: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function AdminJobs({ presetStatus }: { presetStatus?: string }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(presetStatus ?? '');
  const [platform, setPlatform] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const jobs = useQuery({
    queryKey: ['admin', 'jobs', status, platform, search, page],
    queryFn: () =>
      adminApi.jobs({
        status: status || undefined,
        platform: platform || undefined,
        search: search || undefined,
        page,
      }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  };

  const cancel = useMutation({ mutationFn: adminApi.cancelJob, onSuccess: invalidate });
  const retry = useMutation({ mutationFn: adminApi.retryJob, onSuccess: invalidate });
  const del = useMutation({ mutationFn: adminApi.deleteJob, onSuccess: invalidate });

  const items = (jobs.data?.items ?? []) as unknown as JobRow[];
  const total = jobs.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));
  const active = ['QUEUED', 'ANALYZING', 'DOWNLOADING', 'PROCESSING'];
  const retryable = ['FAILED', 'CANCELLED', 'EXPIRED'];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {presetStatus ? 'Downloads' : 'Jobs'}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {presetStatus
            ? 'Completed files that were made available to users.'
            : 'Every pipeline job with live status, filters and controls.'}
        </p>
      </header>

      <Card className="!p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by title or id…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search jobs"
              className="h-10 w-full rounded-xl border border-line bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <Select label={undefined} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select value={platform} onChange={(e) => { setPlatform(e.target.value); setPage(1); }} aria-label="Filter by platform">
            <option value="">All platforms</option>
            {['youtube', 'tiktok', 'instagram', 'facebook', 'x'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
      </Card>

      {items.length === 0 && !jobs.isPending ? (
        <EmptyState title="No jobs match these filters" description="Try a different status, platform or search term." />
      ) : (
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Platform</th>
                <th className="px-4 py-3 font-semibold">Format</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Progress</th>
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((job) => (
                <tr key={job.id} className="border-b border-line/60 last:border-0 hover:bg-surface/50">
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate font-medium text-ink" title={job.title ?? job.id}>{job.title ?? 'Untitled'}</p>
                    <p className="truncate font-mono text-[11px] text-ink-soft">{job.id}</p>
                    {job.errorMessage && (
                      <p className="mt-0.5 truncate text-xs text-danger" title={job.errorMessage}>{job.errorCode}: {job.errorMessage}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-ink">{job.platform}</td>
                  <td className="px-4 py-3 text-ink">{job.format.toUpperCase()} · {job.quality}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[job.status] ?? 'neutral'}>{job.status}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">{job.progress}%</td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">{formatBytes(job.fileSize)}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatDate(job.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {active.includes(job.status) && (
                        <Button size="sm" variant="danger" onClick={() => cancel.mutate(job.id)} icon={<Ban className="size-3.5" aria-hidden="true" />}>
                          Cancel
                        </Button>
                      )}
                      {retryable.includes(job.status) && (
                        <Button size="sm" variant="secondary" onClick={() => retry.mutate(job.id)} icon={<RefreshCw className="size-3.5" aria-hidden="true" />}>
                          Retry
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => del.mutate(job.id)} aria-label={`Delete job ${job.id}`} icon={<Trash2 className="size-3.5" aria-hidden="true" />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-soft">
          <p>
            Page {page} of {pages} · {total} jobs
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
