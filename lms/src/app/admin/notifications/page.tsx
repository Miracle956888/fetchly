import { Bell } from "lucide-react";
import { EmptyState, PhaseNote } from "@/components/ui/empty-state";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          Platform-wide and per-user notifications.
        </p>
      </div>
      <EmptyState
        icon={Bell}
        title="No notification system in this phase"
        description="The notifications schema (per-user, typed, read-state) is in place. The composition, delivery and management UI ships in Phase 02."
      />
      <PhaseNote feature="broadcast announcements, per-user notification templates and read-state management" />
    </div>
  );
}
