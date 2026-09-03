import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const CONFIG: Record<Tone, { cls: string; icon: typeof Info }> = {
  info: { cls: 'border-primary/30 bg-primary-light text-ink', icon: Info },
  success: { cls: 'border-success/30 bg-success/5 text-ink', icon: CheckCircle2 },
  warning: { cls: 'border-warning/40 bg-warning/5 text-ink', icon: AlertTriangle },
  danger: { cls: 'border-danger/30 bg-danger/5 text-ink', icon: XCircle },
};

const ICON_CLS: Record<Tone, string> = {
  info: 'text-primary-dark',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  const { cls, icon: Icon } = CONFIG[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-4 ${cls}`}>
      <Icon className={`mt-0.5 size-5 shrink-0 ${ICON_CLS[tone]}`} aria-hidden="true" />
      <div className="min-w-0 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5 text-ink-soft' : ''}>{children}</div>
      </div>
    </div>
  );
}
