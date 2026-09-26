import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { startQuizAction } from "../../actions";
import { currentOwner, getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { answeredCount, attemptsFor, dueCount, reviewQueue } from "@/lib/engine";
import { FREE_TRIAL_QUESTIONS, getExam } from "@/lib/exams";
import { ensureBank, questionsFor } from "@/lib/questions";

export const metadata: Metadata = { title: "Practice" };

function ModeCard({ title, body, locked, children }: { title: string; body: string; locked?: boolean; children: React.ReactNode }) {
  return (
    <div className={`card flex flex-col p-6 ${locked ? "opacity-75" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {locked && <span className="pill bg-surface-2 text-muted">🔒 Pass</span>}
      </div>
      <p className="mt-1.5 flex-1 text-soft">{body}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default async function PracticeHub({ params, searchParams }: PageProps<"/practice/[exam]">) {
  await ensureBank();
  const { exam: slug } = await params;
  const { empty } = await searchParams;
  const exam = getExam(slug);
  if (!exam) notFound();
  const user = await getUser();
  const access = await getAccess(user?.id);
  const owner = await currentOwner();
  const attempts = owner ? await attemptsFor(owner, slug) : [];
  const used = owner ? await answeredCount(owner, slug) : 0;
  const queue = reviewQueue(attempts);
  const due = dueCount(queue);
  const bank = questionsFor(slug).length;
  const unlock = <Link className="btn-ghost w-full" href={user ? "/pricing" : "/register?next=/pricing"}>Unlock with a pass</Link>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow">{exam.vendor} · {exam.code}</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{exam.name}</h1>
      <p className="mt-2 text-soft">{bank} questions · {exam.examQuestions}-question exam in {exam.examMinutes} minutes · passing score {exam.passingScaled}/1000</p>
      {empty && <p className="mt-4 rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">Nothing to review yet. Missed questions will appear here after you practice.</p>}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {!access.active && (
          <ModeCard title="Free trial" body={used >= FREE_TRIAL_QUESTIONS ? "You've used all your free questions. Get a pass to keep practicing." : `${FREE_TRIAL_QUESTIONS - used} of ${FREE_TRIAL_QUESTIONS} free questions left, with full explanations.`}>
            {used >= FREE_TRIAL_QUESTIONS ? (
              <Link className="btn-primary w-full" href={user ? "/pricing" : "/register?next=/pricing"}>Get unlimited access</Link>
            ) : (
              <form action={startQuizAction}>
                <input type="hidden" name="exam" value={slug} /><input type="hidden" name="mode" value="trial" />
                <button className="btn-primary w-full">{used ? "Continue free trial" : "Start free trial"}</button>
              </form>
            )}
          </ModeCard>
        )}

        <ModeCard title="Practice set" body="Fresh questions you haven't seen yet, with instant feedback. Mix all domains or focus on one." locked={!access.active}>
          {access.active ? (
            <form action={startQuizAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="exam" value={slug} /><input type="hidden" name="mode" value="practice" />
              <select name="domain" className="input !w-auto flex-1" aria-label="Domain">
                <option value="">All domains</option>
                {exam.domains.map((d) => <option key={d.id} value={d.id}>{d.name.replace("Design ", "")}</option>)}
              </select>
              <select name="count" className="input !w-auto" aria-label="Number of questions">
                {[10, 20, 30].map((n) => <option key={n} value={n}>{n} questions</option>)}
              </select>
              <button className="btn-primary">Start</button>
            </form>
          ) : unlock}
        </ModeCard>

        <ModeCard title="Strengthen weak areas" body={`Built from your history: due mistakes, new questions on your weakest topics, and a mixed set to catch regressions.${attempts.length < 5 && access.active ? " Answer a few more questions first so we can find your weak spots." : ""}`} locked={!access.active}>
          {access.active ? (
            <form action={startQuizAction} className="flex gap-2">
              <input type="hidden" name="exam" value={slug} /><input type="hidden" name="mode" value="reinforce" />
              <select name="count" className="input !w-auto" aria-label="Number of questions">{[10, 20].map((n) => <option key={n} value={n}>{n} questions</option>)}</select>
              <button className="btn-primary flex-1" disabled={attempts.length < 5}>Start targeted session</button>
            </form>
          ) : unlock}
        </ModeCard>

        <ModeCard title="Review mistakes" body={queue.length ? `${queue.length} question${queue.length > 1 ? "s" : ""} in your review queue, ${due} due now. Each one returns after 1, 3, 7 and 14 days until you've got it.` : "Questions you miss land here and come back on a spaced schedule."} locked={!access.active}>
          {access.active ? (
            <form action={startQuizAction}>
              <input type="hidden" name="exam" value={slug} /><input type="hidden" name="mode" value="review" /><input type="hidden" name="count" value="20" />
              <button className="btn-primary w-full" disabled={!queue.length}>Review {Math.min(20, queue.length) || ""} mistakes</button>
            </form>
          ) : unlock}
        </ModeCard>

        <ModeCard title="Timed mock exam" body={`${exam.examQuestions} questions in ${exam.examMinutes} minutes, weighted like the real exam. No feedback until you submit, then a full scored review.`} locked={!access.active}>
          {access.active ? (
            <form action={startQuizAction}>
              <input type="hidden" name="exam" value={slug} /><input type="hidden" name="mode" value="exam" />
              <button className="btn-primary w-full">Start mock exam</button>
            </form>
          ) : unlock}
        </ModeCard>
      </div>
    </div>
  );
}
