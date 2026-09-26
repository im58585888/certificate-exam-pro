import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { query } from "./db";

/** The caller's IP, hashed with a server secret so raw addresses are never stored. */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? "dev-secret"}:${ip}`).digest("hex").slice(0, 32);
}

export async function appOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${h.get("host")}`;
}

/** Sliding-window limiter backed by the database: returns false once `max` hits occurred within `windowSec`. */
export async function allowAttempt(key: string, max: number, windowSec: number): Promise<boolean> {
  const rows = await query<{ n: number }>(
    `select count(*)::int as n from auth_throttle where key = $1 and created_at > now() - ($2::int * interval '1 second')`,
    [key, windowSec],
  );
  return (rows[0]?.n ?? 0) < max;
}

export async function recordAttempt(key: string): Promise<void> {
  await query(`insert into auth_throttle (key) values ($1)`, [key]);
  // Opportunistic cleanup so the table stays small.
  if (Math.random() < 0.02) await query(`delete from auth_throttle where created_at < now() - interval '1 day'`);
}
