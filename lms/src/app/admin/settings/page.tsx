import { PhaseNote } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Platform settings</h1>
        <p className="mt-1 text-[14px] text-ink-500">Global platform configuration.</p>
      </div>

      <Alert variant="info" title="Phase 01 status">
        Settings editing arrives in Phase 02. Environment-level configuration (database driver,
        auto-migration, URLs) is managed through the application&apos;s environment variables today —
        see <code className="font-mono text-[12px]">.env.example</code>.
      </Alert>

      <div className="max-w-2xl space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Platform</CardTitle>
            <CardDescription>Name, branding and public announcements.</CardDescription>
          </CardHeader>
          <CardContent>
            <PhaseNote feature="platform name/branding, announcement banners and maintenance mode" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registration & accounts</CardTitle>
            <CardDescription>Open registration, default role, password policy toggles.</CardDescription>
          </CardHeader>
          <CardContent>
            <PhaseNote feature="toggling open registration and configuring the password policy" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
