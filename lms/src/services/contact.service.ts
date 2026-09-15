/**
 * Contact form service. Submissions are stored for the team to review
 * (admin viewing arrives in phase 02).
 */
import { getDb } from "@/db/client";
import { contactMessages } from "@/db/schema";

export async function submitContact(input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<{ id: string }> {
  const db = await getDb();
  const [row] = await db
    .insert(contactMessages)
    .values({
      name: input.name,
      email: input.email,
      subject: input.subject || null,
      message: input.message,
    })
    .returning();
  return { id: row.id };
}
