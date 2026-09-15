import { requireRole } from "@/lib/auth/guards";
import { ProfileForm } from "@/components/forms/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function InstructorProfilePage() {
  const ctx = await requireRole(["instructor"], "/instructor");
  const user = ctx.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          Your public name appears on courses you teach.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>Students see your name on course pages and rosters.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm user={user} />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-500">Username</span>
                <span className="text-[13px] font-medium text-ink-900">@{user.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-500">Email</span>
                <span className="text-[13px] font-medium text-ink-900">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-500">Role</span>
                <Badge variant="brand">instructor</Badge>
              </div>
              <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-[13px] text-ink-500">Member since</span>
                <span className="text-[13px] font-medium text-ink-900">{formatDate(user.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
