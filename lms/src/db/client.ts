import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzleNodePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env";
import { runMigrations, type DriverAdapter } from "./migrate";
import * as schema from "./schema";

export type LmsDatabase = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>;

interface DbBundle {
  db: LmsDatabase;
  pglite?: PGlite;
  pool?: pg.Pool;
}

// Singleton promise on globalThis so Next.js dev HMR does not create a second
// database connection (and a second PGlite data directory) per reload.
const g = globalThis as unknown as { __lmsDb?: Promise<DbBundle> };

async function createBundle(): Promise<DbBundle> {
  if (env.DATABASE_DRIVER === "pglite") {
    // PGlite creates the data directory itself, but requires its parent to exist.
    const pgliteDir = resolve(env.PG_DATA_DIR);
    mkdirSync(dirname(pgliteDir), { recursive: true });
    clearStalePgliteLock(pgliteDir);
    const pglite = new PGlite(pgliteDir);
    await pglite.ready;
    const adapter: DriverAdapter = {
      exec: (sql) => pglite.exec(sql),
      query: async <T>(sql: string) => (await pglite.query<T>(sql)) as unknown as { rows: T[] },
    };
    if (env.AUTO_MIGRATE) {
      const applied = await runMigrations(adapter);
      if (applied.length > 0) console.info(`[db] applied migrations: ${applied.join(", ")}`);
    }
    return { db: drizzle(pglite, { schema }), pglite };
  }

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set when DATABASE_DRIVER=pg");
  }
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });
  const adapter: DriverAdapter = {
    exec: async (sql) => {
      const client = await pool.connect();
      try {
        await client.query(sql);
      } finally {
        client.release();
      }
    },
    query: async <T>(sql: string) => (await pool.query(sql)) as unknown as { rows: T[] },
  };
  if (env.AUTO_MIGRATE) {
    const applied = await runMigrations(adapter);
    if (applied.length > 0) console.info(`[db] applied migrations: ${applied.join(", ")}`);
  }
  return { db: drizzleNodePg(pool, { schema }), pool };
}

/**
 * PGlite keeps a `postmaster.pid` lock in the data directory. If the previous
 * process died without closing cleanly (crash, SIGKILL, timeout), the lock is
 * stale and the next startup would wait on it forever. Remove it when the
 * owning PID is gone; leave it alone when the DB is actually in use.
 */
function clearStalePgliteLock(dir: string): void {
  const pidFile = join(dir, "postmaster.pid");
  if (!existsSync(pidFile)) return;
  let pid: number | null = null;
  try {
    pid = Number(readFileSync(pidFile, "utf8").trim().split("\n")[0]);
  } catch {
    pid = null;
  }
  let ownerAlive = false;
  if (pid !== null && Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(pid, 0);
      ownerAlive = true;
    } catch (err) {
      ownerAlive = (err as NodeJS.ErrnoException).code === "EPERM"; // exists, not ours
    }
  }
  if (!ownerAlive) {
    try {
      unlinkSync(pidFile);
    } catch {
      /* best effort */
    }
  }
}

/** Get the shared database client. */
export function getDb(): Promise<LmsDatabase> {
  let bundle = g.__lmsDb;
  if (!bundle) {
    bundle = createBundle().catch((err) => {
      g.__lmsDb = undefined;
      throw err;
    });
    g.__lmsDb = bundle;
  }
  return bundle.then((b) => b.db);
}

/** Release the shared connection (used by one-shot CLI scripts). */
export async function closeDb(): Promise<void> {
  const pending = g.__lmsDb;
  if (!pending) return;
  try {
    const bundle = await pending;
    if (bundle.pglite) await bundle.pglite.close();
    if (bundle.pool) await bundle.pool.end();
  } finally {
    g.__lmsDb = undefined;
  }
}
