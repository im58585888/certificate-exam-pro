import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

// Placeholder terms: have these reviewed by a lawyer before launch.
export default function Terms() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-soft">
      <h1 className="text-3xl font-extrabold text-ink">Terms of Service</h1>
      <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">Draft: to be finalized before launch.</p>
      <p>Certificate Exam Pro provides original practice questions and study tools. We are not affiliated with any certification body, and practice results do not guarantee exam outcomes.</p>
      <p>A pass grants personal, non-transferable access to one exam for 30 days from purchase (or from the end of any active pass for that exam). Each exam is purchased separately. Passes do not renew automatically.</p>
      <p>Question content is our copyrighted material. You may not copy, scrape, resell or redistribute it.</p>
    </article>
  );
}
