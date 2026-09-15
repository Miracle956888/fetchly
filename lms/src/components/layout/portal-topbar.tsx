"use client";

import * as React from "react";
import { Loader2, LogOut, Settings, User } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { Avatar } from "../ui/avatar";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "../ui/dropdown";
import { api, handleApiError } from "../forms/client-api";

/**
 * Desktop topbar (hidden on mobile — the mobile header lives in the sidebar
 * module) with the portal title + user menu.
 */
export function PortalTopbar({
  user,
  portalLabel,
  portalHref,
  title,
}: {
  user: SessionUser;
  portalLabel: string;
  portalHref: string;
  title?: string;
}) {
  return (
    <div className="hidden h-16 items-center justify-between border-b border-ink-200/70 bg-surface px-8 lg:flex">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[15px] font-semibold text-ink-900">{title ?? portalLabel}</span>
        {title ? <span className="eyebrow">{portalLabel} portal</span> : null}
      </div>
      <UserMenu user={user} portalHref={portalHref} />
    </div>
  );
}

export function UserMenu({ user, portalHref }: { user: SessionUser; portalHref: string }) {
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await api<{ next?: string }>("/api/auth/logout", { method: "POST" });
      if (res?.next) window.location.href = res.next;
    } catch (err) {
      handleApiError(err);
      setLoggingOut(false);
    }
  }

  return (
    <Dropdown
      trigger={
        <button type="button" className="flex items-center gap-2.5 rounded-btn py-1 pl-1 pr-2 transition-colors hover:bg-ink-100">
          <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
          <span className="text-[13px] font-medium text-ink-800">
            {user.firstName} {user.lastName}
          </span>
        </button>
      }
    >
      <DropdownLabel>
        {user.firstName} {user.lastName}
        <span className="block text-[11px] font-normal normal-case text-ink-400">{user.email}</span>
      </DropdownLabel>
      <DropdownSeparator />
      <DropdownItem onSelect={() => (window.location.href = `${portalHref}/profile`)}>
        <User className="h-3.5 w-3.5" aria-hidden />
        Profile
      </DropdownItem>
      <DropdownItem onSelect={() => (window.location.href = `${portalHref}/settings`)}>
        <Settings className="h-3.5 w-3.5" aria-hidden />
        Settings
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem danger onSelect={handleLogout}>
        {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <LogOut className="h-3.5 w-3.5" aria-hidden />}
        Log out
      </DropdownItem>
    </Dropdown>
  );
}
