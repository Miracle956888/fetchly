import { PlatformIcon } from './PlatformIcon';

export function PlatformBadge({ slug, name }: { slug: string; name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
      <PlatformIcon slug={slug} className="size-3.5 text-primary-dark" />
      {name}
    </span>
  );
}
