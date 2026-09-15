"use client";

/**
 * Mobile navigation disclosure (menu button + dropdown panel).
 * Client component: interactive state lives in the browser.
 */
import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "../ui/button";

export interface NavLink {
  href: string;
  label: string;
}

function useMobileNavState() {
  const [isOpen, setOpen] = React.useState(false);
  const open = React.useCallback((fn: (v: boolean) => boolean) => setOpen(fn), []);
  return { isOpen, open };
}

export function MobileNav({ links }: { links: NavLink[] }) {
  const state = useMobileNavState();
  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => state.open((v) => !v)}
        aria-expanded={state.isOpen}
        aria-controls="mobile-nav"
        aria-label={state.isOpen ? "Close menu" : "Open menu"}
        className="rounded-btn p-2 text-ink-700 hover:bg-ink-100"
      >
        {state.isOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
      </button>
      {state.isOpen && (
        <div
          id="mobile-nav"
          className="absolute right-0 top-12 w-64 rounded-card border border-ink-200 bg-surface p-2 shadow-pop"
        >
          <nav aria-label="Main mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => state.open(() => false)}
                className="block rounded-btn px-3 py-2.5 text-[14px] font-medium text-ink-700 hover:bg-ink-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-ink-100 p-2 pt-3">
            <Button href="/login" variant="outline" size="sm">
              Log in
            </Button>
            <Button href="/register" size="sm">
              Get started
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
