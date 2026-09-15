import { requireRole } from "@/lib/auth/guards";
import { PortalShell } from "@/components/layout/portal-shell";
import type { PortalNavItem } from "@/components/layout/portal-sidebar";

export const dynamic = "force-dynamic";

const nav: PortalNavItem[] = [
  { href: "/student", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/student/courses", label: "My courses", icon: "BookOpen" },
  { href: "/student/progress", label: "Progress", icon: "TrendingUp" },
  { href: "/student/quizzes", label: "Quizzes", icon: "ListChecks" },
  { href: "/student/certificates", label: "Certificates", icon: "Award" },
  { href: "/student/profile", label: "Profile", icon: "User" },
  { href: "/student/settings", label: "Settings", icon: "Settings" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole(["student"], "/student");
  return (
    <PortalShell user={ctx.user} portalLabel="Student" portalHref="/student" title="Student" items={nav}>
      {children}
    </PortalShell>
  );
}
