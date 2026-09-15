import { clsx } from "../../lib/clsx";

type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger" | "outline";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  outline: "border border-ink-200 text-ink-600 bg-transparent",
};

export function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const difficultyVariant: Record<string, BadgeVariant> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "danger",
};

export const statusVariant: Record<string, BadgeVariant> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
  active: "success",
  completed: "brand",
  dropped: "neutral",
};
