import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Download,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  ScrollText,
  Settings2,
  Users,
  Wifi,
} from 'lucide-react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { Spinner } from '../../components/ui/Spinner';
import { adminApi } from '../../lib/api';
import AdminAnalytics from './AdminAnalytics';
import AdminDashboard from './AdminDashboard';
import AdminJobs from './AdminJobs';
import AdminLogs from './AdminLogs';
import AdminPlatforms from './AdminPlatforms';
import AdminSettings from './AdminSettings';
import AdminSystem from './AdminSystem';
import AdminUsers from './AdminUsers';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/downloads', label: 'Downloads', icon: Download },
  { to: '/admin/jobs', label: 'Jobs', icon: ListOrdered },
  { to: '/admin/platforms', label: 'Platforms', icon: Wifi },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/system', label: 'System', icon: Activity },
  { to: '/admin/logs', label: 'Logs', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings2 },
];

export default function AdminApp() {
  const navigate = useNavigate();
  const me = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: adminApi.me,
    retry: false,
  });

  if (me.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }
  if (me.isError) return <Navigate to="/admin/login" replace />;

  const logout = async () => {
    try {
      await adminApi.logout();
    } finally {
      navigate('/admin/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-card px-4 py-6 lg:flex">
          <Logo className="h-8" />
          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-ink-soft">Admin</p>
          <nav aria-label="Admin" className="mt-6 flex-1 space-y-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-light text-primary-dark' : 'text-ink-soft hover:bg-surface hover:text-ink'
                  }`
                }
              >
                <item.icon className="size-4.5" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-danger/5 hover:text-danger"
          >
            <LogOut className="size-4.5" aria-hidden="true" />
            Sign out
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Topbar (mobile) */}
          <div className="sticky top-0 z-30 border-b border-line bg-card px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between">
              <Logo className="h-7" />
              <button
                type="button"
                onClick={logout}
                aria-label="Sign out"
                className="rounded-lg p-2 text-ink-soft hover:bg-surface"
              >
                <LogOut className="size-5" />
              </button>
            </div>
            <nav aria-label="Admin" className="mt-3 flex gap-1 overflow-x-auto pb-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                      isActive ? 'bg-primary-light text-primary-dark' : 'text-ink-soft'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="downloads" element={<AdminJobs presetStatus="COMPLETED" />} />
              <Route path="jobs" element={<AdminJobs />} />
              <Route path="platforms" element={<AdminPlatforms />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="system" element={<AdminSystem />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
