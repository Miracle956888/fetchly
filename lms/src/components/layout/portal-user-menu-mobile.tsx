"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { Avatar } from "../ui/avatar";
import { api, handleApiError } from "../forms/client-api";

/** Compact mobile user row shown under the mobile drawer. */
export function UserMenuMobile({ user, portalHref }: { user: SessionUser; portalHref: string }) {
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
    <div className="flex items-center justify-between gap-2 px-1 py-1 lg:hidden">
      <Link href={`${portalHref}/profile`} className="flex items-center gap-2.5 rounded-btn px-2 py-1.5 hover:bg-ink-100">
        <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
        <span className="text-[13px] font-medium text-ink-800">
          {user.firstName} {user.lastName}
        </span>
      </Link>
      <div className="flex items-center gap-1">
        <Link
          href={`${portalHref}/settings`}
          aria-label="Settings"
          className="rounded-btn p-2 text-ink-600 hover:bg-ink-100"
        >
          <Settings className="h-4 w-4" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          disabled={loggingOut}
          className="rounded-btn p-2 text-ink-600 hover:bg-ink-100"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogOut className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
