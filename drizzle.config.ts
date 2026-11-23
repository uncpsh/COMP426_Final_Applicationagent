import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * The app connects through Supabase's pooler in *transaction* mode (port
 * 6543), which is right for short-lived Vercel functions. Migrations need a
 * connection that stays the same for the whole run, so for Drizzle Kit we
 * switch the same pooler URL to *session* mode (port 5432).
 */
function migrationUrl(appUrl: string): string {
  const url = new URL(appUrl);
  const isSupabasePooler = url.hostname.endsWith(".pooler.supabase.com");
  if (isSupabasePooler && url.port === "6543") url.port = "5432";
  return url.toString();
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./supabase/migrations",
  // Drizzle Kit 1.0 manages *every* Postgres schema by default. Supabase owns
  // several of its own schemas (auth, storage, etc.), so we limit Drizzle to
  // the `public` schema where our tables live.
  schemaFilter: ["public"],
  dbCredentials: {
    url: migrationUrl(process.env.DATABASE_URL!),
  },
});
