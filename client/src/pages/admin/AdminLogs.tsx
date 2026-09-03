import { useQuery } from '@tanstack/react-query';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { adminApi } from '../../lib/api';
import { formatDate } from '../../utils/format';

const EVENT_TONE: Record<string, 'success' | 'danger' | 'warning' | 'primary' | 'neutral'> = {
  file_ready: 'success',
  download_completed: 'success',
  download_failed: 'danger',
  failed: 'danger',
  download_cancelled: 'warning',
  cancelled: 'warning',
  job_created: 'primary',
  created: 'primary',
  retry: 'primary',
  download_requested: 'primary',
  download_started: 'primary',
  processing_started: 'neutral',
};

export default function AdminLogs() {
  const events = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: () => adminApi.events(200),
    refetchInterval: 10_000,
  });

  if (events.isPending) return <LoadingState label="Loading logs" />;
  if (events.isError || !events.data) return <p className="text-sm text-danger">Failed to load logs.</p>;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Logs</h1>
        <p className="mt-1 text-sm text-ink-soft">Structured job event trail — no secrets, no personal data.</p>
      </header>

      {events.data.length === 0 ? (
        <EmptyState title="No events yet" description="Job lifecycle events will appear here as downloads run." />
      ) : (
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Message</th>
              </tr>
            </thead>
            <tbody>
              {events.data.map((ev) => (
                <tr key={ev.id} className="border-b border-line/60 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-soft">{formatDate(ev.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={EVENT_TONE[ev.eventType] ?? 'neutral'}>{ev.eventType}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-ink-soft">{ev.jobId.slice(0, 8)}…</td>
                  <td className="max-w-[320px] truncate px-4 py-2.5 text-ink" title={ev.message ?? ''}>
                    {ev.message ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
