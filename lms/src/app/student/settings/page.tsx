import { requireRole } from "@/lib/auth/guards";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseNote } from "@/components/ui/empty-state";

export default async function StudentSettingsPage() {
  const ctx = await requireRole(["student"], "/student");
  void ctx;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-[14px] text-ink-500">Security and account preferences.</p>
      </div>

      <div className="max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              When you change your password, all other active sessions are signed out for security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <PhaseNote feature="notification preferences, learning preferences (pace, goal) and theme settings" />
      </div>
    </div>
  );
}
