import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/States';
import { HBarList } from '../../components/admin/charts';
import { adminApi } from '../../lib/api';

const EVENT_LABELS: Record<string, string> = {
  analyze: 'URL analyses',
  download_created: 'Downloads started',
  download_completed: 'Downloads completed',
  file_delivered: 'Files delivered',
  platform_enabled: 'Platform enabled',
  platform_disabled: 'Platform disabled',
  admin_login: 'Admin logins',
};

export default function AdminAnalytics() {
  const analytics = useQuery({ queryKey: ['admin', 'analytics'], queryFn: adminApi.analytics });

  if (analytics.isPending) return <LoadingState label="Loading analytics" />;
  if (analytics.isError || !analytics.data) return <p className="text-sm text-danger">Failed to load analytics.</p>;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Aggregate, anonymized usage counters. No personal data is tracked.
        </p>
      </header>

      <Card className="max-w-xl">
        <h2 className="mb-4 font-bold text-ink">Events recorded</h2>
        <HBarList
          data={analytics.data.map((ev) => ({
            label: EVENT_LABELS[ev.eventType] ?? ev.eventType,
            value: ev.count,
          }))}
        />
      </Card>
    </div>
  );
}
