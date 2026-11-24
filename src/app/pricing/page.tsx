import Link from "next/link";
import type { Metadata } from "next";
import { checkoutAction, startQuizAction } from "../actions";
import { getUser } from "@/lib/auth";
import { getAccess, paymentsMode } from "@/lib/billing";
import { MiaPose } from "@/components/Mia";
import { WaitlistForm } from "@/components/WaitlistForm";
import { activeOffer, discountedCents, hadOffer, money, OFFER_PERCENT } from "@/lib/offers";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS, PASS_DAYS, PASS_PRICE_CENTS } from "@/lib/exams";

export const metadata: Metadata = {
  title: "Pricing",
  description: `$${(PASS_PRICE_CENTS / 100).toFixed(2)} unlocks one AWS practice exam (CLF-C02, AIF-C01 or SAA-C03) for ${PASS_DAYS} days: every question, detailed explanations, the AI tutor and timed mock exams. One payment, no auto-renewal. Try ${FREE_TRIAL_QUESTIONS} questions free.`,
  alternates: { canonical: "/pricing" },
};

const PAID = [
  "Unlimited practice on the full question bank",
  "Detailed explanations for every option, right or wrong",
  "Adaptive sessions that target your weak and flagged topics",
  "Spaced review that brings missed questions back until you've got them",
  "Timed 65-question mock exams with an estimated score",
  "Save any session and finish later; a mock exam's clock pauses while you're away",
  "Analytics: domain mastery, readiness, accuracy trend, pace",
  "Personal study sheet with your notes, and Mia, your AI tutor, beside it",
];

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function PricingPage({ searchParams }: PageProps<"/pricing">) {
  const { reason, offer: offerParam, exam: examParam } = await searchParams;
  const user = await getUser();
  const offer = await activeOffer(user?.id);
  const offerExam = EXAM_LIST.find((e) => e.slug === (offer?.exam ?? examParam));
  // Visitors who used up their trial and haven't had the offer yet can still claim it here.
  const canClaim = !!offerExam && !offer && (!user || !(await hadOffer(user.id))) && (reason === "trial" || reason === "trial-used");
  const price = `$${(PASS_PRICE_CENTS / 100).toFixed(2)}`;
  const exams = await Promise.all(EXAM_LIST.map(async (exam) => ({ exam, access: await getAccess(user?.id, exam.slug) })));
  const waitlist = paymentsMode === "waitlist";

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      {(reason === "trial" || reason === "trial-used") && (
        <p className="mx-auto mb-6 max-w-2xl rounded-xl bg-brand-soft px-4 py-3 text-center font-semibold text-brand">
          {reason === "trial"
            ? <>You&apos;ve used your {FREE_TRIAL_QUESTIONS} free questions for this exam. Nice work getting started.</>
            : <>You&apos;ve already used your free {offerExam?.code ?? ""} questions on this device or network.</>}
        </p>
      )}
      {offer && offerExam && (
        <div className="mx-auto mb-8 max-w-2xl rounded-2xl border-2 border-ok/50 bg-ok-soft px-5 py-4 text-center">
          <p className="font-extrabold text-ok">🎉 {offerParam === "claimed" ? "Your" : "You have a"} {offer.percent}% off {offerExam.code} {waitlist ? "is reserved" : "is ready"}</p>
          <p className="mt-1 text-sm text-soft">
            {money(discountedCents(offer.percent))} instead of {price} for a {PASS_DAYS}-day pass.{" "}
            {waitlist ? "Passes launch soon: we'll email you, and this price is held for you." : offer.expires_at ? `Use it by ${fmt(new Date(offer.expires_at))}.` : ""}
          </p>
        </div>
      )}
      {offerParam === "used" && !offer && (
        <p className="mx-auto mb-6 max-w-2xl rounded-xl bg-surface-2 px-4 py-3 text-center text-sm text-soft">The free-trial offer is once per person, and you&apos;ve already had yours.</p>
      )}
      {canClaim && offerExam && (
        <div className="mx-auto mb-8 max-w-2xl rounded-2xl border-2 border-ok/50 bg-ok-soft px-5 py-4 text-center">
          <p className="font-extrabold text-ok">Trial offer: {OFFER_PERCENT}% off your {offerExam.code} pass</p>
          <p className="mt-1 text-sm text-soft">{money(discountedCents())} instead of {price} for {PASS_DAYS} days, once per person.</p>
          <a className="btn-primary mt-3 !py-2.5" href={`/offer/claim?exam=${offerExam.slug}`}>{waitlist ? `Reserve ${OFFER_PERCENT}% off` : `Claim ${OFFER_PERCENT}% off`}</a>
        </div>
      )}
      <h1 className="text-center text-4xl font-extrabold tracking-tight">Simple, one-time pricing</h1>
      <p className="mx-auto mt-2 max-w-xl text-center text-soft">
        One {price} pass unlocks one exam for {PASS_DAYS} days. No subscription: buy a pass when you&apos;re studying and let it lapse when you&apos;ve passed.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <div className="card flex flex-col p-7">
          <h2 className="text-lg font-extrabold">Free trial</h2>
          <p className="mt-2 text-4xl font-extrabold">$0</p>
          <p className="text-sm text-muted">No account needed</p>
          <ul className="mt-6 flex-1 space-y-2 text-soft">
            <li>✓ {FREE_TRIAL_QUESTIONS} questions on each exam</li>
            <li>✓ Full explanations on every question</li>
            <li>✓ Results with a domain breakdown</li>
          </ul>
          <div className="mt-7 space-y-2">
            {EXAM_LIST.map((exam) => (
              <form key={exam.slug} action={startQuizAction}>
                <input type="hidden" name="exam" value={exam.slug} />
                <input type="hidden" name="mode" value="trial" />
                <button className="btn-ghost w-full">Try {exam.code} free</button>
              </form>
            ))}
          </div>
        </div>

        {exams.map(({ exam, access }) => (
          <div key={exam.slug} className="card relative flex flex-col border-2 !border-brand p-7">
            <span className="pill absolute -top-3 left-7 bg-brand text-on-brand">{exam.code}</span>
            <h2 className="text-lg font-extrabold">{exam.shortName} pass</h2>
            <p className="text-sm text-muted">{exam.name}</p>
            {offer?.exam === exam.slug ? (
              <p className="mt-2 text-4xl font-extrabold">{money(discountedCents(offer.percent))}<span className="ml-2 text-xl font-bold text-muted line-through">{price}</span><span className="text-base font-bold text-muted"> / {PASS_DAYS} days</span></p>
            ) : (
              <p className="mt-2 text-4xl font-extrabold">{price}<span className="text-base font-bold text-muted"> / {PASS_DAYS} days</span></p>
            )}
            <p className="text-sm text-muted">One-time payment · doesn&apos;t auto-renew</p>
            <ul className="mt-6 flex-1 space-y-2 text-soft">{PAID.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <div className="mt-7">
              {waitlist ? (
                <p className="rounded-xl bg-brand-soft px-4 py-3 text-center text-sm font-semibold text-brand">Passes are launching soon. Join the waitlist below.</p>
              ) : access.admin ? (
                <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm font-semibold text-ok">You&apos;re an admin, so this exam is already unlocked.</p>
              ) : access.active ? (
                <div className="space-y-2">
                  <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm font-semibold text-ok">Active until {fmt(access.endsAt!)}</p>
                  <form action={checkoutAction}><input type="hidden" name="exam" value={exam.slug} /><button className="btn-ghost w-full">Add {PASS_DAYS} more days</button></form>
                </div>
              ) : user ? (
                <form action={checkoutAction}><input type="hidden" name="exam" value={exam.slug} /><button className="btn-primary w-full !py-3">Unlock {exam.code} for {offer?.exam === exam.slug ? money(discountedCents(offer.percent)) : price}</button></form>
              ) : (
                <Link href="/register?next=/pricing" className="btn-primary w-full !py-3">Create account to unlock</Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card mx-auto mt-8 flex max-w-3xl items-end gap-6 overflow-hidden px-7 pt-6">
        <MiaPose pose="confident" height={190} alt="Mia, your AI tutor" className="hidden sm:block" />
        <div className="pb-6">
          <p className="eyebrow">Included with every pass</p>
          <h2 className="mt-1 text-xl font-extrabold">Mia, your AI tutor, on every question</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-soft">
            <li>✓ Breaks down any question without giving the answer away</li>
            <li>✓ Walks you through why the right answer works</li>
            <li>✓ Answers follow-ups with tables and diagrams</li>
            <li>✓ Helps you study any topic from your study sheet</li>
          </ul>
        </div>
      </div>

      {waitlist ? (
        <div className="card mx-auto mt-8 max-w-xl p-7">
          <h2 className="text-lg font-extrabold">Get notified when passes launch</h2>
          <p className="mt-1 text-sm text-soft">The free trials are open now on every exam.</p>
          <div className="mt-4"><WaitlistForm signedInEmail={user?.email} /></div>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-muted">Secure checkout by Stripe. Extra time stacks on any days you have left on that exam. Not happy? Full refund within 7 days of purchase.</p>
      )}
    </div>
  );
}
