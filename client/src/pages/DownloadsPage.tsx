import { useQueries } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DownloadCard } from '../components/DownloadCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/States';
import { Tabs } from '../components/ui/Tabs';
import { useDownloads } from '../contexts/DownloadsContext';
import { api } from '../lib/api';
import type { JobStatus } from '../types';

const TERMINAL: JobStatus[] = ['completed', 'failed', 'cancelled', 'expired'];

type Filter = 'all' | 'mp4' | 'mp3' | 'completed' | 'failed';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mp4', label: 'MP4' },
  { id: 'mp3', label: 'MP3' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
];

/**
 * Download history: every job started in this browser with thumbnail, size,
 * status and date — filterable by format and outcome.
 */
export default function DownloadsPage() {
  const { downloads, removeDownload } = useDownloads();
  const [filter, setFilter] = useState<Filter>('all');

  // Live status for every tracked job (polls only non-terminal ones).
  const queries = useQueries({
    queries: downloads.map((d) => ({
      queryKey: ['job', d.jobId],
      queryFn: () => api.jobStatus(d.jobId),
      refetchInterval: (query: { state: { data?: JobStatusResponseLike; status: string } }) => {
        if (query.state.status === 'error') return false; // deleted record — stop polling
        const status = query.state.data?.status as JobStatus | undefined;
        return status && TERMINAL.includes(status) ? false : 2000;
      },
    })),
  });

  const statusById = useMemo(() => {
    const map = new Map<string, JobStatus | 'unknown'>();
    downloads.forEach((d, i) => {
      map.set(d.jobId, (queries[i]?.data?.status as JobStatus | undefined) ?? 'unknown');
    });
    return map;
  }, [downloads, queries]);

  const visible = downloads.filter((d) => {
    const status = statusById.get(d.jobId);
    switch (filter) {
      case 'mp4':
        return d.format === 'mp4';
      case 'mp3':
        return d.format === 'mp3';
      case 'completed':
        return status === 'completed';
      case 'failed':
        return status === 'failed' || status === 'cancelled' || status === 'expired';
      default:
        return true;
    }
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Your downloads</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          History for this browser. Files expire automatically, so grab them while they last.
        </p>
      </header>

      {downloads.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <Tabs
            tabs={FILTERS}
            active={filter}
            onChange={(id) => setFilter(id as Filter)}
          />
        </div>
      )}

      <div className="mt-5 space-y-3">
        {downloads.length === 0 ? (
          <EmptyState
            title="No downloads yet"
            description="Paste a video link on the homepage and your downloads will show up here."
            action={
              <Link to="/">
                <Button icon={<Download className="size-4" aria-hidden="true" />}>Start a download</Button>
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState title="Nothing matches this filter" description="Try another filter to see the rest of your history." />
        ) : (
          visible.map((item) => (
            <DownloadCard key={item.jobId} item={item} onRemove={removeDownload} showThumbnail />
          ))
        )}
      </div>
    </main>
  );
}

interface JobStatusResponseLike {
  status?: string;
}
