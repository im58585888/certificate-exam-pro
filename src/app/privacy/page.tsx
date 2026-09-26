import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

// Placeholder policy: have this reviewed by a lawyer before launch.
export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-soft">
      <h1 className="text-3xl font-extrabold text-ink">Privacy Policy</h1>
      <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">Draft: to be finalized before launch.</p>
      <p>We store your email, a hashed password, and your practice history so we can personalize your review sessions and analytics.</p>
      <p>Payments are processed by Stripe. We never see or store your card details.</p>
      <p>We use strictly necessary cookies to keep you signed in and to remember free-trial progress. We do not sell your data.</p>
    </article>
  );
}
