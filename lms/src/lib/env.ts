/**
 * Validate the process environment once and expose a typed, frozen view.
 * Failing fast on bad configuration beats failing at runtime inside a request.
 */
import { z } from "zod";

const envSchema = z.object({
  DATABASE_DRIVER: z.enum(["pglite", "pg"]).default("pglite"),
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgres://")).optional(),
  PG_DATA_DIR: z.string().min(1).default("./data/pglite"),
  AUTO_MIGRATE: z
    .string()
    .default("true")
    .transform((v) => v === "true" || v === "1"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // AI Learning Assistant provider selection (Phase 02: "learnly-tutor" =
  // built-in rule-based tutor; hosted providers are added here in later
  // phases). Provider secrets stay server-side env vars, never the frontend.
  AI_TUTOR_PROVIDER: z.string().default("learnly-tutor"),
});

let cached: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error("[env] Invalid environment configuration:");
      for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
      throw new Error("Invalid environment configuration");
    }
    cached = parsed.data;
  }
  return cached;
}

/** Convenience alias for import sites that read env frequently. */
export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get: (_t, prop: string) => Reflect.get(getEnv(), prop),
});
