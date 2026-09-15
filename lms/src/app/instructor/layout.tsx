import { requireRole } from "@/lib/auth/guards";
import { PortalShell } from "@/components/layout/portal-shell";
import type { PortalNavItem } from "@/components/layout/portal-sidebar";

export const dynamic = "force-dynamic";

const nav: PortalNavItem[] = [
  { href: "/instructor", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/instructor/courses", label: "My courses", icon: "BookOpen" },
  { href: "/instructor/students", label: "Students", icon: "Users" },
  { href: "/instructor/analytics", label: "Analytics", icon: "TrendingUp" },
  { href: "/instructor/profile", label: "Profile", icon: "User" },
];

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole(["instructor"], "/instructor");
  return (
    <PortalShell user={ctx.user} portalLabel="Instructor" portalHref="/instructor" title="Instructor" items={nav}>
      {children}
    </PortalShell>
  );
}
