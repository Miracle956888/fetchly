import { clsx } from "../../lib/clsx";

export function ProgressBar({
  value,
  className,
  size = "md",
  label,
}: {
  value: number; // 0..100
  className?: string;
  size?: "sm" | "md";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={clsx(
        "w-full overflow-hidden rounded-full bg-ink-100",
        size === "sm" ? "h-1.5" : "h-2",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function ProgressLine({
  value,
  label,
  detail,
  className,
}: {
  value: number;
  label: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] font-medium text-ink-800">{label}</span>
        <span className="shrink-0 text-[12px] tabular-nums text-ink-500">{detail ?? `${value}%`}</span>
      </div>
      <ProgressBar value={value} size="sm" label={label} />
    </div>
  );
}
