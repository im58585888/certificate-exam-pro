import "server-only";
import Stripe from "stripe";
import { isAdminEmail } from "./auth";
import { one, query } from "./db";
import { EXAMS, getExam, PASS_DAYS } from "./exams";

export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * stripe: real checkout. waitlist: passes not on sale yet, so collect interest (default in production without Stripe).
 * simulated: local development checkout at /checkout/dev.
 */
export const paymentsMode: "stripe" | "waitlist" | "simulated" = stripe
  ? "stripe"
  : process.env.NODE_ENV === "production" || process.env.PAYMENTS_MODE === "waitlist" ? "waitlist" : "simulated";

export interface Access {
  active: boolean;
  /** End of the latest pass covering this exam (null if none). Admins are active without one. */
  endsAt: Date | null;
  admin: boolean;
}

/** Access to one exam: a pass for that exam, a legacy all-exam pass, or admin rights. */
export async function getAccess(userId: string | undefined, exam: string): Promise<Access> {
  if (!userId) return { active: false, endsAt: null, admin: false };
  const row = await one<{ ends_at: Date | null; email: string; email_verified: boolean }>(
    `select u.email, u.email_verified,
       (select max(ends_at) from entitlements where user_id = u.id and starts_at <= now() and (exam = $2 or exam is null)) as ends_at
     from users u where u.id = $1`,
    [userId, exam],
  );
  const endsAt = row?.ends_at ? new Date(row.ends_at) : null;
  // Admins get everything unlocked so they can test every mode without buying a pass.
  const admin = !!row && isAdminEmail(row.email, row.email_verified);
  return { active: admin || (!!endsAt && endsAt > new Date()), endsAt, admin };
}

/** Latest pass end date per exam for a user (legacy all-exam passes count for every exam). */
export async function passEndsByExam(userId: string): Promise<Record<string, Date>> {
  const rows = await query<{ exam: string | null; ends_at: Date }>(
    `select exam, max(ends_at) as ends_at from entitlements where user_id = $1 group by exam`,
    [userId],
  );
  const out: Record<string, Date> = {};
  const all = rows.find((r) => r.exam === null);
  for (const slug of Object.keys(EXAMS)) {
    const own = rows.find((r) => r.exam === slug);
    const ends = [own?.ends_at, all?.ends_at].filter((d): d is Date => !!d).map((d) => new Date(d));
    if (ends.length) out[slug] = new Date(Math.max(...ends.map((d) => d.getTime())));
  }
  return out;
}

/**
 * Grants a 30-day pass for one exam. Idempotent per external payment id, and stacks after any
 * remaining time on that exam so buying early never loses days.
 */
export async function grantPass(userId: string, exam: string, externalId: string, amountCents: number, source: "stripe" | "dev" | "comp", days = PASS_DAYS) {
  if (!getExam(exam)) throw new Error(`Unknown exam ${exam}`);
  await query(
    `insert into entitlements (user_id, exam, starts_at, ends_at, source, external_id, amount_cents)
     select $1, $6, s.start, s.start + make_interval(days => $5::int), $3, $2, $4
     from (select greatest(now(), coalesce((select max(ends_at) from entitlements where user_id = $1 and (exam = $6 or exam is null)), now())) as start) s
     on conflict (external_id) do nothing`,
    [userId, externalId, source, amountCents, days, exam],
  );
}

export async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id ?? session.metadata?.userId;
  const exam = session.metadata?.exam;
  if (!userId || !exam || !getExam(exam) || session.payment_status !== "paid") return false;
  await grantPass(userId, exam, session.id, session.amount_total ?? 0, "stripe");
  // A discounted pass uses up the learner's trial offer.
  const offerId = Number(session.metadata?.offerId);
  if (offerId) await query(`update offers set redeemed_at = now() where id = $1 and user_id = $2 and redeemed_at is null`, [offerId, userId]);
  return true;
}
