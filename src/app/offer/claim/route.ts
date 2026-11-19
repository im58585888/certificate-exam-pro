import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getAccess, paymentsMode } from "@/lib/billing";
import { query } from "@/lib/db";
import { getExam } from "@/lib/exams";
import { claimOffer } from "@/lib/offers";
import { recordConversion } from "@/lib/traffic";

/**
 * "Claim 50% off" from the free-trial pop-ups. The discount belongs to an account, so visitors without one sign up
 * first and come back here. While passes aren't on sale the claim is a launch reservation (and joins the waitlist).
 */
export async function GET(req: Request) {
  const exam = getExam(new URL(req.url).searchParams.get("exam") ?? "");
  if (!exam) redirect("/pricing");
  const back = `/offer/claim?exam=${exam.slug}`;
  const user = await getUser();
  if (!user) redirect(`/register?next=${encodeURIComponent(back)}`);
  if ((await getAccess(user.id, exam.slug)).active) redirect(`/practice/${exam.slug}`);
  const offer = await claimOffer(user.id, exam.slug);
  if (offer) {
    await recordConversion("offer");
    if (paymentsMode === "waitlist") {
      await query(
        `insert into waitlist (email, user_id, source) values ($1, $2, 'trial-offer')
         on conflict (email) do update set user_id = coalesce(waitlist.user_id, excluded.user_id)`,
        [user.email, user.id],
      );
    }
  }
  redirect(`/pricing?offer=${offer ? "claimed" : "used"}&exam=${exam.slug}`);
}
