import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema";

// Both node-postgres and PGlite expose query(sql, params) -> { rows }, so the app talks to either through this shape.
interface Queryable {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

const g = globalThis as unknown as { __cepDb?: Promise<Queryable> };

/**
 * SSL for hosted Postgres. With DATABASE_CA_CERT (the PEM from Supabase → Database settings → SSL Configuration)
 * the server certificate is fully verified. Otherwise hosted databases still get an encrypted connection.
 */
function sslConfig(url: URL) {
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (process.env.DATABASE_CA_CERT) return { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true };
  if (local || url.searchParams.get("sslmode") === "disable") return undefined;
  console.warn("[db] DATABASE_CA_CERT not set: connection is encrypted but the server certificate isn't verified.");
  return { rejectUnauthorized: false };
}

async function connect(): Promise<Queryable> {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete("sslmode"); // SSL is configured explicitly below
    const pool = new Pool({ connectionString: url.toString(), ssl: sslConfig(url), max: Number(process.env.DATABASE_POOL_MAX) || 5 });
    // One migration at a time, even when many server instances start together (works through transaction poolers).
    await pool.query(`begin; select pg_advisory_xact_lock(727201); ${SCHEMA} commit;`);
    return pool as unknown as Queryable;
  }
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_EMBEDDED_DB) {
    throw new Error("DATABASE_URL must be set in production (the embedded PGlite database is for local development only).");
  }
  // Local development: embedded Postgres persisted under .data/ (no external database needed).
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".data/pglite");
  mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  await db.exec(SCHEMA);
  return db as unknown as Queryable;
}

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  g.__cepDb ??= connect().catch((err) => {
    g.__cepDb = undefined; // don't cache a failed connection
    throw err;
  });
  const db = await g.__cepDb;
  return (await db.query<T>(sql, params)).rows;
}

export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await query<T>(sql, params))[0];
}
