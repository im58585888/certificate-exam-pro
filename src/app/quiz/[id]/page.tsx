import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { paymentsMode } from "@/lib/billing";
import { QuizPlayer, type QuizPlayerProps } from "@/components/QuizPlayer";
import { query } from "@/lib/db";
import { ensureBank, feedbackFor, getQuestion, toPublic } from "@/lib/questions";
import { isExpired, loadOwnedSession, sessionAttempts } from "@/lib/quiz";

export const metadata: Metadata = { title: "Practice", robots: { index: false } };

export default async function QuizPage({ params }: PageProps<"/quiz/[id]">) {
  await ensureBank();
  const { id } = await params;
  const loaded = await loadOwnedSession(id);
  if (!loaded) notFound();
  const { session, owner } = loaded;
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

  return (
    <QuizPlayer
      sessionId={id}
      mode={session.mode}
      questions={questions.map((q) => toPublic(q, id))}
      initial={initial}
      deadline={session.time_limit_sec ? new Date(session.created_at).getTime() + session.time_limit_sec * 1000 : null}
      signedIn={!!owner.userId}
      waitlist={paymentsMode === "waitlist"}
    />
  );
}
