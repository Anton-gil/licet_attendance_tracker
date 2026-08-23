import "./src/lib/load-env";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local first.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // RLS policies are authored in schema.ts (pgPolicy) rather than owned by
  // drizzle-kit — Supabase auth/service roles already exist in the DB.
  entities: {
    roles: {
      provider: "supabase",
    },
  },
});
