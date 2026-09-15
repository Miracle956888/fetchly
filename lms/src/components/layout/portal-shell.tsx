import type { SessionUser } from "@/lib/auth/session";
import { Logo } from "./logo";
import { PortalSidebar, PortalSidebarMobile, type PortalNavItem } from "./portal-sidebar";
import { PortalTopbar, UserMenu } from "./portal-topbar";
import { UserMenuMobile } from "./portal-user-menu-mobile";

/**
 * Shared shell for the student / instructor / admin portals:
 * fixed sidebar on desktop, drawer topbar on mobile, topbar with user menu.
 *
 * The shell is a plain server component; the interactive bits (drawer,
 * user menu) are client components.
 */
export function PortalShell({
  user,
  portalLabel,
  portalHref,
  items,
  children,
  title,
}: {
  user: SessionUser;
  portalLabel: string;
  portalHref: string;
  items: PortalNavItem[];
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-paper">
      {/* Mobile topbar + drawer */}
      <PortalSidebarMobile portalLabel={portalLabel} portalHref={portalHref} title={portalLabel} items={items}>
        <UserMenuMobile user={user} portalHref={portalHref} />
      </PortalSidebarMobile>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ink-200/70 bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-ink-100 px-5">
          <Logo href={portalHref} />
        </div>
        <PortalSidebar items={items} portalLabel={portalLabel} />
        <div className="border-t border-ink-100 px-3 py-3">
          <UserMenu user={user} portalHref={portalHref} />
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-60">
        <PortalTopbar user={user} portalLabel={portalLabel} portalHref={portalHref} title={title} />
        <main className="container-page py-6 lg:py-8" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
