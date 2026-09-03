interface ProgressBarProps {
  value: number; // 0..100
  label?: string;
  size?: 'sm' | 'md';
  indeterminate?: boolean;
}

export function ProgressBar({ value, label, size = 'md', indeterminate = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
      className={`w-full overflow-hidden rounded-full bg-line/70 ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}
    >
      <div
        className={`h-full rounded-full bg-primary transition-[width] duration-300 ${
          indeterminate ? 'w-1/3 animate-pulse' : ''
        }`}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}
