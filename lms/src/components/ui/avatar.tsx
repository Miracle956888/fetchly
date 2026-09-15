import { initials as toInitials } from "@/lib/utils";
import { clsx } from "../../lib/clsx";

const sizes = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-[13px]",
  lg: "h-12 w-12 text-base",
};

export function Avatar({
  firstName,
  lastName,
  size = "md",
  className,
}: {
  firstName: string;
  lastName: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800",
        sizes[size],
        className,
      )}
    >
      {toInitials(firstName, lastName)}
    </span>
  );
}
