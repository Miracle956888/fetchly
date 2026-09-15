import { clsx } from "@/lib/clsx";

/** Stat tile for dashboards (real data only). */
export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-ink-200/80 bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium uppercase tracking-wider text-ink-500">{label}</p>
        {icon && <span className="text-ink-300">{icon}</span>}
      </div>
      <p className={clsx("mt-2 font-display text-2xl font-semibold tabular-nums text-ink-900")}>{value}</p>
      {hint && <p className="mt-1 text-[12px] text-ink-500">{hint}</p>}
    </div>
  );
}
