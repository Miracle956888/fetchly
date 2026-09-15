import { requireRole } from "@/lib/auth/guards";
import { PortalShell } from "@/components/layout/portal-shell";
import type { PortalNavItem } from "@/components/layout/portal-sidebar";

export const dynamic = "force-dynamic";

const nav: PortalNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/users", label: "Users", icon: "Users" },
  { href: "/admin/students", label: "Students", icon: "GraduationCap" },
  { href: "/admin/instructors", label: "Instructors", icon: "UserCog" },
  { href: "/admin/courses", label: "Courses", icon: "BookOpen" },
  { href: "/admin/categories", label: "Categories", icon: "Tags" },
  { href: "/admin/learning-paths", label: "Learning paths", icon: "Route" },
  { href: "/admin/enrollments", label: "Enrollments", icon: "ListChecks" },
  { href: "/admin/quizzes", label: "Quizzes", icon: "BarChart3" },
  { href: "/admin/certificates", label: "Certificates", icon: "Award" },
  { href: "/admin/notifications", label: "Notifications", icon: "Bell" },
  { href: "/admin/settings", label: "Settings", icon: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole(["admin"], "/admin");
  return (
    <PortalShell user={ctx.user} portalLabel="Admin" portalHref="/admin" title="Admin" items={nav}>
      {children}
    </PortalShell>
  );
}
