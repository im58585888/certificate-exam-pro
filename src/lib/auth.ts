import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { one, query } from "./db";
import { moveTrialClaims } from "./trial";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const SESSION_COOKIE = "cep_session";
const ANON_COOKIE = "cep_anon";
const SESSION_DAYS = 30;

export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string | null): Promise<boolean> {
  if (!stored) return false; // accounts created with Google sign-in have no password
  const [, salt, key] = stored.split("$");
  if (!salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scrypt(pw, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const cookieOpts = (days: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: days * 86400,
});

/** Creates a session and moves any anonymous trial progress onto the account. Call from a Server Action. */
export async function signIn(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await query(`insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + interval '${SESSION_DAYS} days')`, [sha256(token), userId]);
  await query(`update users set last_login_at = now() where id = $1`, [userId]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOpts(SESSION_DAYS));
  const anon = jar.get(ANON_COOKIE)?.value;
  if (anon) {
    await query(`update quiz_sessions set user_id = $1 where anon_id = $2 and user_id is null`, [userId, anon]);
    await query(`update attempts set user_id = $1 where anon_id = $2 and user_id is null`, [userId, anon]);
    // Flags the account already has win; the rest move over.
    await query(
      `delete from flags f where f.anon_id = $2 and f.user_id is null and exists (select 1 from flags u where u.user_id = $1 and u.question_id = f.question_id)`,
      [userId, anon],
    );
    await query(`update flags set user_id = $1 where anon_id = $2 and user_id is null`, [userId, anon]);
    await moveTrialClaims(anon, userId);
  }
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query(`delete from sessions where token_hash = $1`, [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

export const getUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await one<User>(
    `select u.id, u.email, u.name, u.email_verified as "emailVerified" from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
  return row ?? null;
});

export async function getAnonId(): Promise<string | undefined> {
  return (await cookies()).get(ANON_COOKIE)?.value;
}

/** Returns the visitor's anonymous id, creating it if needed. Only callable where cookies can be set. */
export async function ensureAnonId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(ANON_COOKIE)?.value;
  if (existing) return existing;
  const id = randomUUID();
  jar.set(ANON_COOKIE, id, cookieOpts(365));
  return id;
}

/** Who owns quiz data for this request: a signed-in user, or an anonymous trial visitor. */
export type Owner = { userId: string; anonId?: undefined } | { userId?: undefined; anonId: string };

export async function currentOwner(): Promise<Owner | null> {
  const user = await getUser();
  if (user) return { userId: user.id };
  const anonId = await getAnonId();
  return anonId ? { anonId } : null;
}

/** SQL fragment + param matching rows owned by `owner`, starting at placeholder $n. */
export function ownerClause(owner: Owner, n: number): [string, string] {
  return owner.userId ? [`user_id = $${n}`, owner.userId] : [`anon_id = $${n} and user_id is null`, owner.anonId!];
}

/** Ends every session for a user (e.g. after a password reset). */
export async function signOutEverywhere(userId: string): Promise<void> {
  await query(`delete from sessions where user_id = $1`, [userId]);
}

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/** Admin needs a proven email (Google sign-in or a reset link), so registering someone else's address with a password isn't enough. */
export function isAdmin(user: User | null): boolean {
  return !!user && isAdminEmail(user.email, user.emailVerified);
}

export function isAdminEmail(email: string, emailVerified: boolean): boolean {
  return emailVerified && adminEmails().includes(email.toLowerCase());
}

/** For admin pages and actions: returns the admin user or throws a 404 so the area's existence isn't revealed. */
export async function requireAdmin(): Promise<User> {
  const user = await getUser();
  if (!user || !isAdmin(user)) notFound();
  return user;
}
