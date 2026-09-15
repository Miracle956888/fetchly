import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-card border border-dashed border-ink-200 bg-surface/60 px-6 py-14 text-center ${className ?? ""}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-500">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-4 font-display text-[15px] font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13px] leading-5 text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Honest "reserved for a later phase" callout used across portals. */
export function PhaseNote({ feature, className }: { feature: string; className?: string }) {
  return (
    <div className={`rounded-btn border border-ink-200 bg-ink-50 px-4 py-3 text-[13px] leading-5 text-ink-600 ${className ?? ""}`}>
      <span className="font-semibold text-ink-800">Reserved for Phase 02:</span> {feature}. The data model and
      service interfaces for this area are in place — the interactive UI ships next.
    </div>
  );
}
