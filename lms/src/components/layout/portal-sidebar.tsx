"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Menu,
  Route,
  Settings,
  Tags,
  TrendingUp,
  User,
  UserCog,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "@/lib/clsx";

/**
 * Nav items cross the server→client boundary, so icons travel as *names*
 * and are resolved here (component functions cannot be serialized across
 * the RSC boundary).
 */
export type PortalIconName =
  | "LayoutDashboard"
  | "BookOpen"
  | "TrendingUp"
  | "ListChecks"
  | "Award"
  | "User"
  | "Settings"
  | "Users"
  | "GraduationCap"
  | "UserCog"
  | "Tags"
  | "Route"
  | "BarChart3"
  | "Bell";

const ICONS: Record<PortalIconName, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  ListChecks,
  Award,
  User,
  Settings,
  Users,
  GraduationCap,
  UserCog,
  Tags,
  Route,
  BarChart3,
  Bell,
};

export function NavIcon({ name, className }: { name: PortalIconName; className?: string }) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden />;
}

export interface PortalNavItem {
  href: string;
  label: string;
  icon: PortalIconName;
}

function navLinkClasses(active: boolean) {
  return clsx(
    "flex items-center gap-2.5 rounded-btn px-3 py-2 text-[13.5px] font-medium transition-colors",
    active ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  );
}

/** Desktop sidebar nav with active-route highlighting. */
export function PortalSidebar({ items, portalLabel }: { items: PortalNavItem[]; portalLabel: string }) {
  const pathname = usePathname();
  return (
    <>
      <div className="px-4 pb-2 pt-4">
        <p className="eyebrow px-1">{portalLabel}</p>
      </div>
      <nav aria-label={`${portalLabel} navigation`} className="flex-1 overflow-y-auto px-3 pb-6">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/student" && pathname.startsWith(`${item.href}/`));
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={navLinkClasses(active)}>
                  <NavIcon name={item.icon} className="h-4 w-4 shrink-0 opacity-70" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/**
 * Mobile topbar + slide-down drawer for portal navigation.
 */
export function PortalSidebarMobile({
  portalLabel,
  portalHref,
  title,
  items,
  children,
}: {
  portalLabel: string;
  portalHref: string;
  title: string;
  items: PortalNavItem[];
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-surface/95 backdrop-blur-sm lg:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="portal-drawer"
            aria-label={open ? "Close navigation" : "Open navigation"}
            className="rounded-btn p-2 text-ink-700 hover:bg-ink-100"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
          <p className="font-display text-[15px] font-semibold text-ink-900">{title}</p>
        </div>
        <span className="eyebrow">{portalLabel}</span>
      </div>
      {open && (
        <nav id="portal-drawer" aria-label={`${portalLabel} navigation`} className="border-t border-ink-100 bg-surface px-3 py-3">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(navLinkClasses(active), "py-2.5")}
                  >
                    <NavIcon name={item.icon} className="h-4 w-4 shrink-0 opacity-70" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <span className="hidden">{portalHref}</span>
      {children}
    </header>
  );
}
