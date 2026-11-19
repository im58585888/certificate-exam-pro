import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import type { Owner } from "./auth";
import { one, query } from "./db";
import { clientIpHash } from "./request";

// One free trial per person and exam, checked in layers: this browser (a cookie, backed up in local storage), this
// device (hashed IP + browser), and this network (at most NETWORK_PEOPLE different people, so shared offices, campuses
// and mobile carriers still work). Only one-way hashes are stored, never IP addresses.

export const TRIALS_COOKIE = "cep_trials";
const NETWORK_PEOPLE = Number(process.env.TRIAL_NETWORK_PEOPLE) || 2;
const WINDOW = "30 days";

const ownerKey = (o: Owner) => (o.userId ? `u:${o.userId}` : `a:${o.anonId}`);

async function deviceHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const ua = h.get("user-agent") ?? "";
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? "dev-secret"}:device:${ip}:${ua}`).digest("hex").slice(0, 32);
}

/** Exams this browser has started a free trial for (the cookie, which TrialMemory also restores from local storage). */
async function browserTrials(): Promise<string[]> {
  return ((await cookies()).get(TRIALS_COOKIE)?.value ?? "").split(",").filter(Boolean);
}

/**
 * Why this visitor can't start a free trial of `exam`, or null if they can. Their own trial (same account or anonymous
 * id) always carries on; the checks only stop a second trial from the same browser, device or network.
 */
export async function trialBlocked(owner: Owner, exam: string): Promise<"browser" | "device" | "network" | null> {
  const me = ownerKey(owner);
  if (await one(`select 1 from trial_claims where exam = $1 and owner = $2`, [exam, me])) return null;
  if ((await browserTrials()).includes(exam)) return "browser";
  if (await one(
    `select 1 from trial_claims where exam = $1 and device = $2 and owner <> $3 and created_at > now() - interval '${WINDOW}'`,
    [exam, await deviceHash(), me],
  )) return "device";
  const people = await one<{ n: number }>(
    `select count(distinct owner)::int as n from trial_claims where exam = $1 and network = $2 and owner <> $3 and created_at > now() - interval '${WINDOW}'`,
    [exam, await clientIpHash(), me],
  );
  return (people?.n ?? 0) >= NETWORK_PEOPLE ? "network" : null;
}

/** Records that this visitor started their free trial of `exam`, and marks the browser. */
export async function recordTrial(owner: Owner, exam: string): Promise<void> {
  await query(
    `insert into trial_claims (exam, owner, device, network) values ($1, $2, $3, $4) on conflict (exam, owner) do nothing`,
    [exam, ownerKey(owner), await deviceHash(), await clientIpHash()],
  );
  const marks = new Set([...(await browserTrials()), exam]);
  (await cookies()).set(TRIALS_COOKIE, [...marks].join(","), {
    httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 400 * 86400,
  });
}

/** On sign-in, an anonymous visitor's trials become the account's, so their own trial carries on. */
export async function moveTrialClaims(anonId: string, userId: string): Promise<void> {
  const [from, to] = [`a:${anonId}`, `u:${userId}`];
  await query(`delete from trial_claims a where a.owner = $1 and exists (select 1 from trial_claims u where u.owner = $2 and u.exam = a.exam)`, [from, to]);
  await query(`update trial_claims set owner = $2 where owner = $1`, [from, to]);
}
