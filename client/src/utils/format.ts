/**
 * Canonical file-size formatter. 1024-based, labels B/KB/MB/GB/TB,
 * precision by magnitude, trailing zeros trimmed:
 *   0 → "0 B" · 1024 → "1 KB" · 1048576 → "1 MB"
 *   865075 → "845 KB" · 13212058 → "12.6 MB" · 1524793344 → "1.42 GB"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  if (i === 0) return `${Math.round(value)} B`;
  const decimals = value < 10 ? 2 : value < 100 ? 1 : 0;
  const text = value.toFixed(decimals).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return `${text} ${units[i]}`;
}

/** Backwards-compatible alias. */
export const formatBytes = formatFileSize;

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(rest).padStart(2, '0')}`;
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(iso: string | Date | number): string {
  const d = typeof iso === 'number' ? new Date(iso) : typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
