import path from "node:path";
import { promises as fs } from "node:fs";

// Minimal, transparent SQL migrator.
//
// Drizzle Kit (drizzle-kit generate) produces numbered .sql files in ./drizzle.
// This runner applies any pending files in lexicographic order and tracks them
// in a local `lms_migrations` table. It intentionally avoids driver-specific
// migration machinery so it behaves identically for the embedded PGlite dev
// database and a hosted PostgreSQL connection.
export interface DriverAdapter {
  /** Execute a SQL script (may contain multiple statements). */
  exec(sql: string): Promise<unknown>;
  /** Run a query and return its rows. */
  query<T>(sql: string): Promise<{ rows: T[] }>;
}

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

export async function runMigrations(adapter: DriverAdapter): Promise<string[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    return []; // no migrations directory — nothing to do
  }

  await adapter.exec(
    "CREATE TABLE IF NOT EXISTS lms_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());",
  );

  const applied = new Set<string>(
    (await adapter.query<{ name: string }>("SELECT name FROM lms_migrations")).rows.map((r) => r.name),
  );

  const appliedNow: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    // drizzle-kit separates statements with a `--> statement-breakpoint`
    // marker; run each statement individually so any driver can execute it.
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const statement of statements) {
      await adapter.exec(statement);
    }
    await adapter.exec(`INSERT INTO lms_migrations (name) VALUES ('${file.replace(/'/g, "''")}');`);
    appliedNow.push(file);
  }
  return appliedNow;
}
