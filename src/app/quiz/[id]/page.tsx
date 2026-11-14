import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { aiAvailable } from "@/lib/ai";
import { getAccess, paymentsMode } from "@/lib/billing";
import { getExam } from "@/lib/exams";
import { QuizPlayer, type QuizPlayerProps } from "@/components/QuizPlayer";
import { query } from "@/lib/db";
import { flagsFor } from "@/lib/flags";
import { ensureBank, feedbackFor, getQuestion, toPublic } from "@/lib/questions";
import { deadlineOf, isExpired, loadOwnedSession, resumeSession, sessionAttempts } from "@/lib/quiz";

export const metadata: Metadata = { title: "Practice", robots: { index: false } };

export default async function QuizPage({ params }: PageProps<"/quiz/[id]">) {
  await ensureBank();
  const { id } = await params;
  const loaded = await loadOwnedSession(id);
  if (!loaded) notFound();
  const { owner } = loaded;
  const session = await resumeSession(loaded.session);
  if (session.finished_at) redirect(`/results/${id}`);
  if (isExpired(session)) {
    await query(`update quiz_sessions set finished_at = now() where id = $1 and finished_at is null`, [id]);
    redirect(`/results/${id}`);
  }

  const questions = session.question_ids.map(getQuestion).filter((q) => !!q);
  const initial: QuizPlayerProps["initial"] = {};
  for (const a of await sessionAttempts(id)) {
    const q = getQuestion(a.question_id);
    if (q) initial[q.id] = session.mode === "exam" ? { picks: a.picks } : { picks: a.picks, feedback: feedbackFor(q, a.picks) };
  }

  const inSession = new Set(session.question_ids);
  const flagged = (await flagsFor(owner, session.exam)).map((f) => f.question_id).filter((qid) => inSession.has(qid));

  return (
    <QuizPlayer
      sessionId={id}
      mode={session.mode}
      questions={questions.map((q) => toPublic(q, id))}
      initialFlags={flagged}
      initial={initial}
      deadline={deadlineOf(session)}
      canSave={!!owner.userId && session.mode !== "trial" && (await getAccess(owner.userId, session.exam)).active}
      signedIn={!!owner.userId}
      examCode={getExam(session.exam)?.code ?? session.exam.toUpperCase()}
      waitlist={paymentsMode === "waitlist"}
      tutor={aiAvailable}
    />
  );
}
