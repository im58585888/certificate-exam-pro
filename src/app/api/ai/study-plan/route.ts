import { AiError, aiAvailable, failureCode, spendAllowance } from "@/lib/ai";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { getExam } from "@/lib/exams";
import { ensureBank } from "@/lib/questions";
import { studyPlanFor } from "@/lib/studyplan";
import { fail, LIMIT_MESSAGE } from "../shared";

export const maxDuration = 120;

/** Mia's study plan: the learner's mistakes grouped by AWS service, and what to focus on. Rewritten when they change. */
export async function POST(req: Request) {
  if (!aiAvailable) return fail(503, "The AI tutor isn't available right now.");
  const body = await req.json().catch(() => ({}));
  const exam = typeof body.exam === "string" ? getExam(body.exam) : undefined;
  if (!exam) return fail(400, "Bad request.");
  const user = await getUser();
  if (!user) return fail(401, "Sign in to see your study sheet.");
  const access = await getAccess(user.id, exam.slug);
  if (!access.active) return fail(403, "The study sheet is part of the exam pass.");
  await ensureBank();
  try {
    const plan = await studyPlanFor(user.id, exam, { write: () => spendAllowance({ userId: user.id }, true, access.admin) });
    if (plan === "limit") return fail(429, LIMIT_MESSAGE);
    return Response.json({ plan });
  } catch (err) {
    console.error("[ai] study plan failed", err);
    return fail(502, err instanceof AiError ? err.message : `Mia couldn't sort your mistakes (${failureCode(err)}).`);
  }
}
