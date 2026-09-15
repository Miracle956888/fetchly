import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { clsx } from "../../lib/clsx";

type AlertVariant = "info" | "success" | "warning" | "danger";

const styles: Record<AlertVariant, { box: string; icon: React.ReactNode }> = {
  info: { box: "border-brand-200 bg-brand-50 text-brand-800", icon: <Info className="h-4 w-4 shrink-0" aria-hidden /> },
  success: { box: "border-success-100 bg-success-50 text-success-700", icon: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> },
  warning: { box: "border-warning-100 bg-warning-50 text-warning-700", icon: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> },
  danger: { box: "border-danger-100 bg-danger-50 text-danger-700", icon: <XCircle className="h-4 w-4 shrink-0" aria-hidden /> },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const s = styles[variant];
  return (
    <div role={variant === "danger" || variant === "warning" ? "alert" : "status"} className={clsx("flex items-start gap-2.5 rounded-btn border px-3.5 py-3 text-[13px] leading-5", s.box, className)}>
      <span className="mt-0.5">{s.icon}</span>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
    </div>
  );
}
