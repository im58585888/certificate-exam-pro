import { AiError, aiAvailable, cachedCoach, failureCode, spendAllowance, writeCoach, type SessionReview } from "@/lib/ai";
import { getAccess } from "@/lib/billing";
import { DOMAIN_SHORT, getExam } from "@/lib/exams";
import { ensureBank, getQuestion } from "@/lib/questions";
import { loadOwnedSession, sessionAttempts } from "@/lib/quiz";
import { fail, LIMIT_MESSAGE } from "../shared";

export const maxDuration = 60;

/** Mia's short review of a finished session: what the results show and a few suggestions. Written once per session. */
export async function POST(req: Request) {
  if (!aiAvailable) return fail(503, "The AI tutor isn't available right now.");
  const body = await req.json().catch(() => ({}));
  if (typeof body.sessionId !== "string") return fail(400, "Bad request.");
  await ensureBank();
  const loaded = await loadOwnedSession(body.sessionId);
  if (!loaded) return fail(404, "Session not found.");
  const { session, owner } = loaded;
  if (session.mode === "exam" && !session.finished_at) return fail(403, "Finish the mock exam first.");
  const exam = getExam(session.exam);
  if (!exam) return fail(404, "Session not found.");

  const attempts = await sessionAttempts(session.id);
  const rows = attempts.map((a) => ({ a, q: getQuestion(a.question_id) })).filter((x) => x.q);
  if (!rows.length) return fail(400, "Answer a few questions first.");
  const correct = rows.filter((x) => x.a.correct).length;
  const domains = exam.domains.map((d) => {
    const r = rows.filter((x) => x.q!.domain === d.id);
    return r.length ? `${DOMAIN_SHORT[d.id] ?? d.name} ${r.filter((x) => x.a.correct).length}/${r.length}` : "";
  }).filter(Boolean);
  const review: SessionReview = {
    sessionId: session.id,
    examName: `${exam.code} ${exam.name}`,
    mode: session.mode === "exam" ? "timed mock exam" : "practice",
    score: `${correct}/${rows.length} correct`,
    avgSeconds: Math.round(rows.reduce((s, x) => s + (x.a.time_ms ?? 0), 0) / rows.length / 1000),
    domains,
    missed: rows.filter((x) => !x.a.correct).slice(0, 30).map((x) => ({ topic: x.q!.topic, concept: x.q!.explanation.concept })),
  };

  const hit = await cachedCoach(review);
  if (hit) return Response.json({ note: hit });
  const access = await getAccess(owner.userId, session.exam);
  if (!(await spendAllowance(owner, access.active, access.admin))) return fail(429, LIMIT_MESSAGE);
  try {
    return Response.json({ note: await writeCoach(review) });
  } catch (err) {
    console.error("[ai] coach failed", err);
    return fail(502, err instanceof AiError ? err.message : `Mia couldn't review this session (${failureCode(err)}).`);
  }
}
