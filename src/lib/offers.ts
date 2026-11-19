import "server-only";
import { paymentsMode } from "./billing";
import { one, query } from "./db";
import { getExam, PASS_PRICE_CENTS } from "./exams";

// The free-trial discount: half price on one 30-day pass, once per person.

export const OFFER_PERCENT = 50;
export const OFFER_HOURS = 72;

export interface Offer {
  id: number;
  exam: string;
  percent: number;
  expires_at: Date | null;
}

export const discountedCents = (percent = OFFER_PERCENT) => Math.floor((PASS_PRICE_CENTS * (100 - percent)) / 100);
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** The learner's unused, unexpired offer (optionally only if it's for `exam`). */
export async function activeOffer(userId: string | undefined, exam?: string): Promise<Offer | null> {
  if (!userId) return null;
  return (await one<Offer>(
    `select id, exam, percent, expires_at from offers
     where user_id = $1 and redeemed_at is null and (expires_at is null or expires_at > now()) and ($2::text is null or exam = $2)`,
    [userId, exam ?? null],
  )) ?? null;
}

/**
 * Gives the learner their one trial offer for `exam` (a no-op if they already had one, for any exam). While passes
 * aren't on sale it's a launch reservation with no deadline; with live checkout it lasts OFFER_HOURS.
 */
export async function claimOffer(userId: string, exam: string): Promise<Offer | null> {
  if (!getExam(exam)) return null;
  const expires = paymentsMode === "waitlist" ? "null" : `now() + interval '${OFFER_HOURS} hours'`;
  await query(
    `insert into offers (user_id, exam, percent, expires_at) values ($1, $2, $3, ${expires}) on conflict (user_id) do nothing`,
    [userId, exam, OFFER_PERCENT],
  );
  return activeOffer(userId);
}

/** Has this person already had their one trial offer (used, unused or expired)? */
export async function hadOffer(userId: string): Promise<boolean> {
  return !!(await one(`select 1 from offers where user_id = $1`, [userId]));
}
