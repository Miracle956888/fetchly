import { clsx } from "../../lib/clsx";

export function Card({ className, children, as: As = "div" }: { className?: string; children: React.ReactNode; as?: React.ElementType }) {
  return <As className={clsx("rounded-card border border-ink-200/80 bg-surface shadow-card", className)}>{children}</As>;
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("border-b border-ink-100 px-5 py-4", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={clsx("font-display text-[15px] font-semibold text-ink-900", className)}>{children}</h3>;
}

export function CardDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={clsx("mt-1 text-[13px] text-ink-500", className)}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("border-t border-ink-100 px-5 py-3.5", className)}>{children}</div>;
}
