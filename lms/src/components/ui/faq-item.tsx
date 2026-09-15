"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "@/lib/clsx";

/** Single expandable FAQ row (client: disclosure state). */
export function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  const id = `faq-${q.slice(0, 12).replace(/\s+/g, "-")}`;
  return (
    <div className="overflow-hidden rounded-card border border-ink-200/80 bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-[14.5px] font-medium text-ink-900">{q}</span>
        <ChevronDown className={clsx("h-4 w-4 shrink-0 text-ink-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <p id={id} className="border-t border-ink-100 px-5 py-4 text-[14px] leading-6 text-ink-600">
          {a}
        </p>
      )}
    </div>
  );
}
