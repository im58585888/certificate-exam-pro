import Link from "next/link";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { fulfillCheckout, getAccess, stripe } from "@/lib/billing";
import { DEFAULT_EXAM, getExam } from "@/lib/exams";

export const metadata: Metadata = { title: "Payment received", robots: { index: false } };

export default async function CheckoutSuccess({ searchParams }: PageProps<"/checkout/success">) {
  const { session_id } = await searchParams;
  const user = await getUser();
  let examSlug = DEFAULT_EXAM;
  // The webhook is the source of truth; this also fulfils immediately in case the webhook is still in flight.
  if (stripe && typeof session_id === "string" && session_id.startsWith("cs_")) {
    const s = await stripe.checkout.sessions.retrieve(session_id);
    if (s.metadata?.exam && getExam(s.metadata.exam)) examSlug = s.metadata.exam;
    if (user && s.client_reference_id === user.id) await fulfillCheckout(s);
  }
  const exam = getExam(examSlug)!;
  const access = await getAccess(user?.id, exam.slug);
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold">{access.active ? "You're all set 🎉" : "Payment received"}</h1>
      <p className="mt-2 text-soft">
        {access.active && access.endsAt
          ? `Unlimited ${exam.code} practice is active until ${access.endsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
          : "We're confirming your payment. This usually takes a few seconds. Refresh this page shortly."}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link className="btn-primary" href={`/practice/${exam.slug}`}>Start practicing</Link>
        <Link className="btn-ghost" href={`/dashboard?exam=${exam.slug}`}>Dashboard</Link>
      </div>
    </div>
  );
}
