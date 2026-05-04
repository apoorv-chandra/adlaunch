import { drizzlu } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

export type Env = {
  DATABASE_URL: string;
  [key: string]: string | undefined;
};

/**
 * Create a Drizzle ORM client backed by Neon's HTTP driver.
 *
 * The Neon HTTP driver is ideal for Cloudflare Workers because it runs
 * serverless HTTP queries rather than a persistent TCP connection.
 *
 * Usage:
 *   import { createDb } from "@/db";
 *   const db = createDb(env.DATABASE_URL);
 */
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema, logger: false });
}

export type Database = ReturnType<typeof createDb>;

// Re-export schema so callers don't need a separate import
export * from "./schema";
