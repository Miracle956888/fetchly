import { Award } from "lucide-react";
import { getDb } from "@/db/client";
import { certificates } from "@/db/schema";
import { Table, TBody, Td, Th, Tr, THead } from "@/components/ui/table";
import { EmptyState, PhaseNote } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  const rows = await getDb().then((db) => db.select().from(certificates));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Certificates</h1>
        <p className="mt-1 text-[14px] text-ink-500">Issued certificates with verification codes.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates issued yet"
          description="Certificates are issued when students complete courses. None have been earned so far."
        />
      ) : (
        <Table>
          <THead>
            <Th>Code</Th>
            <Th>Student</Th>
            <Th>Issued</Th>
            <Th>State</Th>
          </THead>
          <TBody>
            {rows.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <span className="font-mono text-[12px]">{c.code}</span>
                </Td>
                <Td>—</Td>
                <Td>{formatDate(c.issuedAt)}</Td>
                <Td>
                  <Badge variant={c.revokedAt ? "neutral" : "success"}>{c.revokedAt ? "revoked" : "valid"}</Badge>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      <PhaseNote feature="automatic issuance on course completion, public verification page, and revocation controls" />
    </div>
  );
}
