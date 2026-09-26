import Link from "next/link";
import type { Metadata } from "next";
import { checkoutAction, startQuizAction } from "../actions";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { FREE_TRIAL_QUESTIONS, PASS_DAYS, PASS_PRICE_CENTS } from "@/lib/exams";

export const metadata: Metadata = { title: "Pricing" };

const PAID = [
  "Unlimited practice across every exam we offer",
  "Detailed explanations for every option, right or wrong",
  "Adaptive sessions that target your weak topics",
  "Spaced review that brings missed questions back until you've got them",
  "Timed 65-question mock exams with an estimated score",
  "Analytics: domain mastery, readiness, accuracy trend, pace",
];

export default async function PricingPage({ searchParams }: PageProps<"/pricing">) {
  const { reason } = await searchParams;
  const user = await getUser();
  const access = await getAccess(user?.id);
  const price = `$${(PASS_PRICE_CENTS / 100).toFixed(2)}`;
  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      {reason === "trial" && (
        <p className="mx-auto mb-6 max-w-2xl rounded-xl bg-brand-soft px-4 py-3 text-center font-semibold text-brand">
          You&apos;ve used your {FREE_TRIAL_QUESTIONS} free questions. Nice work getting started.
        </p>
      )}
      <h1 className="text-center text-4xl font-extrabold tracking-tight">Simple, one-time pricing</h1>
      <p className="mx-auto mt-2 max-w-xl text-center text-soft">No subscription. Buy a pass when you&apos;re studying, and let it lapse when you&apos;ve passed.</p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="card p-7">
          <h2 className="text-lg font-extrabold">Free trial</h2>
          <p className="mt-2 text-4xl font-extrabold">$0</p>
          <p className="text-sm text-muted">No account needed</p>
          <ul className="mt-6 space-y-2 text-soft">
            <li>✓ {FREE_TRIAL_QUESTIONS} questions on SAA-C03</li>
            <li>✓ Full explanations on every question</li>
            <li>✓ Results with a domain breakdown</li>
          </ul>
          <form action={startQuizAction} className="mt-7">
            <input type="hidden" name="exam" value="saa-c03" />
            <input type="hidden" name="mode" value="trial" />
            <button className="btn-ghost w-full !py-3">Start free trial</button>
          </form>
        </div>

        <div className="card relative border-2 !border-brand p-7">
          <span className="pill absolute -top-3 left-7 bg-brand text-on-brand">All exams</span>
          <h2 className="text-lg font-extrabold">All-access pass</h2>
          <p className="mt-2 text-4xl font-extrabold">{price}<span className="text-base font-bold text-muted"> / {PASS_DAYS} days</span></p>
          <p className="text-sm text-muted">One-time payment · doesn&apos;t auto-renew</p>
          <ul className="mt-6 space-y-2 text-soft">{PAID.map((f) => <li key={f}>✓ {f}</li>)}</ul>
          <div className="mt-7">
            {access.active ? (
              <div className="space-y-2">
                <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm font-semibold text-ok">Active until {access.endsAt!.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                <form action={checkoutAction}><button className="btn-ghost w-full">Add {PASS_DAYS} more days</button></form>
              </div>
            ) : user ? (
              <form action={checkoutAction}><button className="btn-primary w-full !py-3">Unlock for {price}</button></form>
            ) : (
              <Link href="/register?next=/pricing" className="btn-primary w-full !py-3">Create account to unlock</Link>
            )}
            <p className="mt-2 text-center text-xs text-muted">Secure checkout by Stripe. Extra time stacks on any days you have left.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
