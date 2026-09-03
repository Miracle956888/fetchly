import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlatformIcon } from '../../components/PlatformIcon';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/States';
import { Toggle } from '../../components/ui/Toggle';
import { adminApi } from '../../lib/api';

export default function AdminPlatforms() {
  const queryClient = useQueryClient();
  const platforms = useQuery({ queryKey: ['admin', 'platforms'], queryFn: adminApi.platforms });

  const toggle = useMutation({
    mutationFn: ({ slug, enabled }: { slug: string; enabled: boolean }) =>
      adminApi.setPlatform(slug, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platforms'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
    },
  });

  if (platforms.isPending) return <LoadingState label="Loading platforms" />;
  if (platforms.isError || !platforms.data) return <p className="text-sm text-danger">Failed to load platforms.</p>;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Platforms</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Enable or disable providers without redeploying. Unimplemented providers cannot be enabled.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {platforms.data.map((p) => (
          <Card key={p.slug} className="flex items-center gap-3.5 !p-4 sm:!p-5">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${p.implemented ? 'bg-primary-light text-primary-dark' : 'bg-surface text-ink-soft/50'}`}>
              <PlatformIcon slug={p.slug} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{p.name}</p>
              <div className="mt-1 flex gap-1.5">
                {p.implemented ? (
                  p.enabled ? <Badge tone="success">Active</Badge> : <Badge tone="warning">Disabled</Badge>
                ) : (
                  <Badge tone="neutral">Not implemented</Badge>
                )}
              </div>
            </div>
            <Toggle
              checked={p.enabled && p.implemented}
              disabled={!p.implemented || toggle.isPending}
              label={`Enable ${p.name}`}
              onChange={(checked) => toggle.mutate({ slug: p.slug, enabled: checked })}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
