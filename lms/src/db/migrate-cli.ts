/**
 * CLI: apply pending database migrations.
 *   npm run db:migrate
 *
 * Works for both the embedded PGlite dev database and a hosted PostgreSQL
 * connection (selected via DATABASE_DRIVER / DATABASE_URL).
 */
import "dotenv/config";
import { closeDb, getDb } from "./client";

async function main() {
  // getDb() opens the connection and applies any pending migrations.
  await getDb();
  console.info("[db] migrations applied — database ready.");
  await closeDb();
  process.exit(0);
}

main().catch((err) => {
  console.error("[db] migration failed:", err);
  process.exit(1);
});
