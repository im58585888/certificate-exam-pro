import { aiAvailable, spendAllowance, studyChat } from "@/lib/ai";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { getExam } from "@/lib/exams";
import { ensureBank } from "@/lib/questions";
import { studySheet } from "@/lib/studysheet";
import { fail, LIMIT_MESSAGE, textStream, validTurns } from "../shared";

export const maxDuration = 120;

/** The study sheet's tutor: exam-wide chat for pass holders. */
export async function POST(req: Request) {
  if (!aiAvailable) return fail(503, "The AI tutor isn't available right now.");
  const body = await req.json().catch(() => ({}));
  const turns = validTurns(body.turns);
  const exam = getExam(typeof body.exam === "string" ? body.exam : "");
  if (!turns || !exam) return fail(400, "Bad request.");
  const user = await getUser();
  if (!user) return fail(401, "Sign in to use the study tutor.");
  const access = await getAccess(user.id, exam.slug);
  if (!access.active) return fail(403, `The study tutor is part of the ${exam.code} pass.`);
  if (!(await spendAllowance({ userId: user.id }, true, access.admin))) return fail(429, LIMIT_MESSAGE);
  await ensureBank();
  const weak = (await studySheet({ userId: user.id }, exam.slug)).filter((t) => t.missed > 0).map((t) => t.topic);
  return textStream(studyChat(exam.name, weak, turns));
}
