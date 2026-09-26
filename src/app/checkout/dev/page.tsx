import { notFound, redirect } from "next/navigation";
import { devGrantAction } from "../../actions";
import { getUser } from "@/lib/auth";
import { stripe } from "@/lib/billing";

// Stand-in for Stripe Checkout while developing without Stripe keys. Never available in production.
export default async function DevCheckout() {
  if (process.env.NODE_ENV === "production" || stripe) notFound();
  if (!(await getUser())) redirect("/login?next=/pricing");
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="pill bg-warn-soft text-warn">Development mode</p>
      <h1 className="mt-4 text-2xl font-extrabold">Simulated checkout</h1>
      <p className="mt-2 text-soft">Stripe keys aren&apos;t configured, so this grants a 30-day pass locally without charging anything.</p>
      <form action={devGrantAction} className="mt-6"><button className="btn-primary w-full !py-3">Simulate successful payment</button></form>
    </div>
  );
}
