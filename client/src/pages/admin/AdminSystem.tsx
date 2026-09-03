import { useQuery } from '@tanstack/react-query';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/States';
import { adminApi } from '../../lib/api';

export default function AdminSystem() {
  const system = useQuery({
    queryKey: ['admin', 'system'],
    queryFn: adminApi.system,
    refetchInterval: 15_000,
  });

  if (system.isPending) return <LoadingState label="Loading system status" />;
  if (system.isError || !system.data) return <p className="text-sm text-danger">Failed to load system status.</p>;
  const s = system.data;

  const rows: Array<{ label: string; value: string; tone?: 'success' | 'danger' | 'warning' }> = [
    { label: 'API', value: 'online', tone: 'success' },
    { label: 'Database', value: `${s.database} (${s.persistence})`, tone: s.database === 'ok' ? 'success' : 'warning' },
    { label: 'Redis / queue', value: s.redis, tone: s.redis.startsWith('configured') ? 'success' : 'warning' },
    { label: 'FFmpeg', value: s.ffmpeg.available ? s.ffmpeg.version ?? 'available' : 'not installed', tone: s.ffmpeg.available ? 'success' : 'danger' },
    { label: 'Media engine (yt-dlp)', value: s.engine.available ? s.engine.version ?? 'available' : 'not installed', tone: s.engine.available ? 'success' : 'danger' },
    { label: 'Node.js', value: s.node },
    { label: 'Uptime', value: `${Math.floor(s.uptimeSec / 3600)}h ${Math.floor((s.uptimeSec % 3600) / 60)}m` },
    { label: 'Memory (RSS)', value: `${s.memoryMb} MB` },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">System</h1>
        <p className="mt-1 text-sm text-ink-soft">Live health of every subsystem, refreshed every 15 seconds.</p>
      </header>

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3.5 font-medium text-ink">{row.label}</td>
                <td className="px-5 py-3.5">
                  <Badge tone={row.tone ?? 'neutral'} className="capitalize">{row.value}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ink">Configured limits</h2>
        <ul className="grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
          {Object.entries(s.limits).map(([key, value]) => (
            <li key={key} className="flex justify-between rounded-lg bg-surface px-3.5 py-2.5">
              <span className="font-medium text-ink">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className="tabular-nums">{value}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
