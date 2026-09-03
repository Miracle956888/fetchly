import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/States';
import { adminApi } from '../../lib/api';

const KNOWN_KEYS = [
  'maintenance_mode',
  'notice_banner',
  'max_resolution',
  'default_audio_bitrate',
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.settings });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => adminApi.saveSettings(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (settings.isPending) return <LoadingState label="Loading settings" />;
  if (settings.isError) return <p className="text-sm text-danger">Failed to load settings.</p>;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Operational overrides stored in the database. Runtime limits stay in environment variables
          so secrets never enter the UI.
        </p>
      </header>

      <Card className="max-w-xl space-y-4">
        {KNOWN_KEYS.map((key) => (
          <Input
            key={key}
            label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            value={draft[key] ?? ''}
            placeholder="Not set"
            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          />
        ))}
        <div className="flex items-center gap-3">
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Save settings
          </Button>
          {saved && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" /> Saved
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
