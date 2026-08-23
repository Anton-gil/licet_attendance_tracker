import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * DATABASE_URL must point at the Supavisor *transaction pooler* connection
 * string, not a direct connection — serverless + a direct Postgres
 * connection exhausts at load (docs/spec.md §12). `prepare: false` is
 * required in transaction-pooling mode.
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env.local first.");
  }
  return url;
}

const client = postgres(getDatabaseUrl(), { prepare: false });

export const db = drizzle(client, { schema });
