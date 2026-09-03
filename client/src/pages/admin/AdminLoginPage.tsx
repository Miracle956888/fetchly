import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { adminApi, ApiClientError } from '../../lib/api';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () => adminApi.login(email, password),
    onSuccess: () => navigate('/admin', { replace: true }),
  });

  const error = login.error instanceof ApiClientError ? login.error.message : null;

  if (login.isSuccess) return <Navigate to="/admin" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo className="h-9" />
        </div>
        <div className="rounded-2xl border border-line bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
              <ShieldCheck className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-bold text-ink">Admin sign in</h1>
              <p className="text-xs text-ink-soft">Authorized personnel only</p>
            </div>
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate();
            }}
          >
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              error={error ?? undefined}
            />
            <Button type="submit" full loading={login.isPending}>
              Sign in
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-ink-soft">
          Login attempts are rate limited and sessions expire automatically.
        </p>
      </div>
    </main>
  );
}
