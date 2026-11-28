import { AiError, aiAvailable, cachedGaps, failureCode, spendAllowance, writeGaps, type GapInput } from "@/lib/ai";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { getExam } from "@/lib/exams";
import { gapReport } from "@/lib/gaps";
import { ensureBank, questionsFor } from "@/lib/questions";
import { studySheet } from "@/lib/studysheet";
import { fail, LIMIT_MESSAGE } from "../shared";

export const maxDuration = 60;

/** Mia's diagnosis of the learner's open mistakes on the study sheet. Rewritten only when those mistakes change. */
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

  const report = gapReport(await studySheet({ userId: user.id }, exam.slug));
  if (!report.mistakeIds.length) return fail(400, "No open mistakes.");
  const concept = new Map(questionsFor(exam.slug).map((q) => [q.id, `${q.topic}: ${q.explanation.concept}`]));
  const input: GapInput = {
    ownerKey: user.id,
    exam: exam.slug,
    examName: `${exam.code} ${exam.name}`,
    mistakeIds: report.mistakeIds,
    services: report.services.map((s) => `${s.name} (missed ${s.missed}, ${s.right}/${s.total} right)`),
    mixups: report.mixups.map((m) => `picked ${m.picked} when the answer was ${m.answer} (x${m.count})`),
    concepts: report.mistakeIds.slice(0, 30).map((id) => concept.get(id)).filter((c): c is string => !!c),
  };

  const hit = await cachedGaps(input);
  if (hit) return Response.json({ note: hit });
  if (!(await spendAllowance({ userId: user.id }, true, access.admin))) return fail(429, LIMIT_MESSAGE);
  try {
    return Response.json({ note: await writeGaps(input) });
  } catch (err) {
    console.error("[ai] gaps failed", err);
    return fail(502, err instanceof AiError ? err.message : `Mia couldn't write your diagnosis (${failureCode(err)}).`);
  }
}
