import { Award } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getDb } from "@/db/client";
import { certificates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EmptyState, PhaseNote } from "@/components/ui/empty-state";

export default async function StudentCertificatesPage() {
  const ctx = await requireRole(["student"], "/student");
  const rows = await getDb().then((db) => db.select().from(certificates).where(eq(certificates.userId, ctx.user.id)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Certificates</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          Certificates are issued automatically when you complete a course&apos;s requirements.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Complete a course — all lessons and passing quizzes — and your certificate will appear here with a unique verification code."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="rounded-card border border-ink-200/80 bg-surface p-5 shadow-card">
              <p className="text-[15px] font-semibold text-ink-900">Course certificate</p>
              <p className="mt-1 font-mono text-[12px] text-ink-500">Verification code: {c.code}</p>
            </li>
          ))}
        </ul>
      )}

      <PhaseNote feature="certificate issuance on course completion (the certificates schema, completion tracking and verification-code design are in place)" />
    </div>
  );
}
