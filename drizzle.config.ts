import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./supabase/migrations",
  // Drizzle Kit 1.0 manages *every* Postgres schema by default. Supabase owns
  // several of its own schemas (auth, storage, etc.), so we limit Drizzle to
  // the `public` schema where our tables live.
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
