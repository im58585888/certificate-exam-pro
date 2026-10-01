import { notFound, redirect } from "next/navigation";
import { devGrantAction } from "../../actions";
import { getUser } from "@/lib/auth";
import { paymentsMode } from "@/lib/billing";
import { getExam, PASS_DAYS } from "@/lib/exams";

// Stand-in for Stripe Checkout while developing without Stripe keys. Never available in production.
export default async function DevCheckout({ searchParams }: PageProps<"/checkout/dev">) {
  if (paymentsMode !== "simulated") notFound();
  if (!(await getUser())) redirect("/login?next=/pricing");
  const { exam: raw } = await searchParams;
  const exam = getExam(typeof raw === "string" ? raw : "");
  if (!exam) redirect("/pricing");
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="pill bg-warn-soft text-warn">Development mode</p>
      <h1 className="mt-4 text-2xl font-extrabold">Simulated checkout</h1>
      <p className="mt-2 text-soft">Stripe keys aren&apos;t configured, so this grants a {PASS_DAYS}-day {exam.code} pass locally without charging anything.</p>
      <form action={devGrantAction} className="mt-6">
        <input type="hidden" name="exam" value={exam.slug} />
        <button className="btn-primary w-full !py-3">Simulate successful payment</button>
      </form>
    </div>
  );
}
