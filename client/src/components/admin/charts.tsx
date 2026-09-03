/**
 * Dependency-free SVG charts. Data is always real server output — the admin
 * dashboard never renders invented numbers.
 */

export function BarChart({
  data,
  height = 170,
}: {
  data: Array<{ date: string; total: number; completed: number; failed: number }>;
  height?: number;
}) {
  const width = 620;
  const pad = 8;
  const max = Math.max(1, ...data.map((d) => d.total));
  const bw = (width - pad * 2) / Math.max(1, data.length);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Downloads over the last 14 days"
      >
        {data.map((d, i) => {
          const x = pad + i * bw + bw * 0.18;
          const w = bw * 0.64;
          const totalH = (d.total / max) * (height - 26);
          const completedH = (d.completed / max) * (height - 26);
          const failedH = (d.failed / max) * (height - 26);
          const yTotal = height - 18 - totalH;
          return (
            <g key={d.date}>
              <title>{`${d.date}: ${d.total} total, ${d.completed} completed, ${d.failed} failed`}</title>
              <rect x={x} y={yTotal} width={w} height={Math.max(2, totalH)} rx={3} fill="var(--sf-line)" />
              <rect
                x={x}
                y={height - 18 - completedH}
                width={w}
                height={Math.max(0, completedH)}
                rx={3}
                fill="#00C9A7"
              />
              <rect
                x={x}
                y={height - 18 - completedH - failedH}
                width={w}
                height={Math.max(0, failedH)}
                rx={3}
                fill="#DC2626"
              />
              {i % 2 === 0 && (
                <text x={x + w / 2} y={height - 4} textAnchor="middle" fontSize="9" fill="var(--sf-ink-soft)">
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-ink-soft">
        <LegendDot color="#00C9A7" label="Completed" />
        <LegendDot color="#DC2626" label="Failed" />
        <LegendDot color="var(--sf-line)" label="Total" />
      </figcaption>
    </figure>
  );
}

export function HBarList({
  data,
  formatValue = (n) => String(n),
}: {
  data: Array<{ label: string; value: number }>;
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="text-sm text-ink-soft">No data yet.</p>;
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium capitalize text-ink">{d.label}</span>
            <span className="tabular-nums text-ink-soft">{formatValue(d.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line/60">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DonutChart({
  data,
  size = 140,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <p className="text-sm text-ink-soft">No data yet.</p>;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <figure className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Format distribution">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--sf-surface)" strokeWidth="12" />
        {data.map((d) => {
          const frac = d.value / total;
          const dash = frac * c;
          const el = (
            <circle
              key={d.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="12"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="50" y="54" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--sf-ink)">
          {total}
        </text>
      </svg>
      <figcaption className="space-y-1.5">
        {data.map((d) => (
          <p key={d.label} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: d.color }} aria-hidden="true" />
            <span className="font-medium capitalize text-ink">{d.label}</span>
            <span className="text-ink-soft">({d.value})</span>
          </p>
        ))}
      </figcaption>
    </figure>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}
