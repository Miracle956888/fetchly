import Link from "next/link";
import { clsx } from "@/lib/clsx";

/** Wordmark + geometric mark. Flat, no gradients — an "academic instrument" feel. */
export function Logo({ dark = false, href = "/", className }: { dark?: boolean; href?: string; className?: string }) {
  return (
    <Link href={href} className={clsx("inline-flex items-center gap-2.5", className)} aria-label="Learnly home">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden className="shrink-0">
        <rect x="1" y="1" width="24" height="24" rx="6" className={dark ? "fill-white/10" : "fill-ink-900"} />
        <path
          d="M8.5 9.5 L5 13 L8.5 16.5"
          stroke={dark ? "#FFFFFF" : "#FFFFFF"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 16.5 L16.5 9.5"
          stroke={dark ? "#FFFFFF" : "#FFFFFF"}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span className={clsx("font-display text-[17px] font-semibold tracking-tight", dark ? "text-white" : "text-ink-900")}>
        Learnly
      </span>
    </Link>
  );
}
