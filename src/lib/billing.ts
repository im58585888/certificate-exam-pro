import "server-only";
import Stripe from "stripe";
import { one, query } from "./db";
import { PASS_DAYS } from "./exams";

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
  endsAt: Date | null;
}

export async function getAccess(userId: string | undefined): Promise<Access> {
  if (!userId) return { active: false, endsAt: null };
  const row = await one<{ ends_at: Date }>(
    `select max(ends_at) as ends_at from entitlements where user_id = $1 and starts_at <= now()`,
    [userId],
  );
  const endsAt = row?.ends_at ? new Date(row.ends_at) : null;
  return { active: !!endsAt && endsAt > new Date(), endsAt };
}

/**
 * Grants a 30-day all-access pass. Idempotent per external payment id, and stacks after any
 * remaining time so buying early never loses days.
 */
export async function grantPass(userId: string, externalId: string, amountCents: number, source: "stripe" | "dev" | "comp", days = PASS_DAYS) {
  await query(
    `insert into entitlements (user_id, starts_at, ends_at, source, external_id, amount_cents)
     select $1, s.start, s.start + make_interval(days => $5::int), $3, $2, $4
     from (select greatest(now(), coalesce((select max(ends_at) from entitlements where user_id = $1), now())) as start) s
     on conflict (external_id) do nothing`,
    [userId, externalId, source, amountCents, days],
  );
}

export async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id ?? session.metadata?.userId;
  if (!userId || session.payment_status !== "paid") return false;
  await grantPass(userId, session.id, session.amount_total ?? 0, "stripe");
  return true;
}
