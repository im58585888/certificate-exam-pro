import { EXAMS, PASS_DAYS } from "@/lib/exams";
import { query } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/mailer";
import { SITE_URL } from "@/lib/seo";

// Daily job (Vercel Cron): emails pass holders 7 days and 1 day before their pass for an exam ends, once per stage.
// Off unless PASS_REMINDERS=on and mail is configured; Vercel sends CRON_SECRET as a bearer token.
export const dynamic = "force-dynamic";

const STAGES = [
  { col: "reminded_7d_at", from: "6 days", to: "7 days", when: "in 7 days" },
  { col: "reminded_1d_at", from: "0 days", to: "1 day", when: "tomorrow" },
] as const;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  if (process.env.PASS_REMINDERS !== "on" || !mailConfigured) return Response.json({ sent: 0, skipped: "reminders off" });

  let sent = 0;
  for (const st of STAGES) {
    // The pass's latest end date per user and exam (extra days stack), ending inside this stage's window.
    const rows = await query<{ id: number; email: string; exam: string; ends_at: Date }>(
      `select e.id, u.email, e.exam, e.ends_at from entitlements e join users u on u.id = e.user_id
       where e.exam is not null and e.${st.col} is null
         and e.ends_at > now() + interval '${st.from}' and e.ends_at <= now() + interval '${st.to}'
         and e.ends_at = (select max(ends_at) from entitlements x where x.user_id = e.user_id and x.exam = e.exam)
       limit 200`,
    );
    for (const r of rows) {
      const code = EXAMS[r.exam]?.code ?? r.exam.toUpperCase();
      const date = new Date(r.ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
      try {
        await sendMail({
          to: r.email,
          subject: `Your ${code} pass ends ${st.when}`,
          text: `Your ${code} pass on Certificate Exam Pro ends ${st.when} (${date}). Your progress and notes stay saved either way.\n\nNeed more time? Add ${PASS_DAYS} more days, which stack on the days you have left: ${SITE_URL}/pricing\nCheck your readiness first: ${SITE_URL}/dashboard?exam=${r.exam}\n\nPasses never renew automatically.`,
          html: `<p>Your <b>${code}</b> pass on Certificate Exam Pro ends ${st.when} (${date}). Your progress and notes stay saved either way.</p><p>Need more time? <a href="${SITE_URL}/pricing">Add ${PASS_DAYS} more days</a>; they stack on the days you have left.<br>Check your <a href="${SITE_URL}/dashboard?exam=${r.exam}">readiness</a> first.</p><p style="color:#777">Passes never renew automatically.</p>`,
        });
        await query(`update entitlements set ${st.col} = now() where id = $1`, [r.id]);
        sent++;
      } catch (err) {
        console.error("pass reminder failed", r.id, err instanceof Error ? err.message : err);
      }
    }
  }
  return Response.json({ sent });
}
