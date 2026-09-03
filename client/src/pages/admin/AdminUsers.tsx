import { useQuery } from '@tanstack/react-query';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/States';
import { adminApi } from '../../lib/api';
import { formatDate } from '../../utils/format';

export default function AdminUsers() {
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.users });

  if (users.isPending) return <LoadingState label="Loading users" />;
  if (users.isError || !users.data) return <p className="text-sm text-danger">Failed to load users.</p>;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Users</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Fetchly does not require accounts for downloads — this list holds operator accounts only.
        </p>
      </header>

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.data.map((user) => (
              <tr key={user.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{user.name}</td>
                <td className="px-4 py-3 text-ink-soft">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={user.role === 'ADMIN' ? 'primary' : 'neutral'}>{user.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={user.status === 'ACTIVE' ? 'success' : 'danger'}>{user.status}</Badge>
                </td>
                <td className="px-4 py-3 text-ink-soft">{formatDate(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
