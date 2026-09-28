import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { SessionFlagButton } from "@/components/FlagButton";
import { ReportQuestion } from "@/components/ReportQuestion";
import { DOMAIN_LABEL, ExplanationPanel, OptionList, QuestionMeta, QuestionText } from "@/components/QuestionParts";
import { getAccess, paymentsMode } from "@/lib/billing";
import { getExam, PASS_DAYS, PASS_PRICE_CENTS } from "@/lib/exams";
import { ensureBank, feedbackFor, getQuestion, toPublic } from "@/lib/questions";
import { flagsFor } from "@/lib/flags";
import { loadOwnedSession, sessionAttempts } from "@/lib/quiz";

export const metadata: Metadata = { title: "Results", robots: { index: false } };

export default async function ResultsPage({ params }: PageProps<"/results/[id]">) {
  await ensureBank();
  const { id } = await params;
  const loaded = await loadOwnedSession(id);
  if (!loaded) notFound();
  const { session, owner } = loaded;
  const attempts = await sessionAttempts(id);
  if (!session.finished_at && session.mode === "exam") redirect(`/quiz/${id}`);
  const exam = getExam(session.exam)!;
  const access = await getAccess(owner.userId);
  const flagged = new Set((await flagsFor(owner, session.exam)).map((f) => f.question_id));

  const byQ = new Map(attempts.map((a) => [a.question_id, a]));
  const items = session.question_ids.map((qid) => ({ q: getQuestion(qid)!, a: byQ.get(qid) })).filter((x) => x.q);
  const answered = items.filter((x) => x.a);
  const correct = answered.filter((x) => x.a!.correct).length;
  const total = session.mode === "exam" ? items.length : answered.length;
  const pct = total ? correct / total : 0;
  const scaled = Math.round(100 + 900 * pct);
  const avgSec = answered.length ? Math.round(answered.reduce((s, x) => s + (x.a!.time_ms ?? 0), 0) / answered.length / 1000) : 0;

  const domains = exam.domains.map((d) => {
    const rows = answered.filter((x) => x.q.domain === d.id);
    return { ...d, n: rows.length, ok: rows.filter((x) => x.a!.correct).length };
  }).filter((d) => d.n > 0);

  const ordered = [...items].sort((x, y) => Number(x.a?.correct ?? false) - Number(y.a?.correct ?? false));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="eyebrow">{exam.code} · {session.mode === "exam" ? "Timed mock exam" : session.mode === "trial" ? "Free trial" : session.mode === "flagged" ? "Flagged questions" : "Practice session"} results</p>
      <div className="mt-3 grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
        <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(var(--brand) ${pct * 360}deg, var(--line) 0)` }}>
          <div className="grid h-28 w-28 place-items-center rounded-full bg-bg text-center">
            <div><b className="block text-3xl">{Math.round(pct * 100)}%</b><span className="text-xs text-muted">{correct}/{total} correct</span></div>
          </div>
        </div>
        <div>
          {session.mode === "exam" ? (
            <>
              <h1 className="text-3xl font-extrabold">Estimated score: {scaled} <span className="text-lg font-bold text-muted">/ 1000</span></h1>
              <p className={`mt-1 font-bold ${scaled >= exam.passingScaled ? "text-ok" : "text-bad"}`}>
                {scaled >= exam.passingScaled ? "Above" : "Below"} the {exam.passingScaled} passing line
              </p>
              <p className="mt-1 text-sm text-muted">A practice estimate, not an official score. AWS scales scores across exam versions.</p>
            </>
          ) : (
            <h1 className="text-3xl font-extrabold">{pct >= 0.8 ? "Excellent work." : pct >= 0.6 ? "Solid progress." : "Good start. Now close the gaps."}</h1>
          )}
          <p className="mt-2 text-soft">Average time per question: {avgSec}s{session.mode === "exam" ? ` (the real exam allows about ${Math.round((exam.examMinutes * 60) / exam.examQuestions)}s)` : ""}.</p>
        </div>
      </div>

      {domains.length > 0 && (
        <div className="card mt-8 p-5">
          <h2 className="font-extrabold">By exam domain</h2>
          <div className="mt-4 space-y-3">
            {domains.map((d) => (
              <div key={d.id}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{DOMAIN_LABEL[d.id]}</span><span className="text-muted">{d.ok}/{d.n}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${(d.ok / d.n) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!access.active ? (
        <div className="card mt-8 bg-gradient-to-br from-[#4338CA] to-[#A21CAF] p-7 text-white">
          <h2 className="text-2xl font-extrabold">Keep going with unlimited practice</h2>
          <ul className="mt-3 space-y-1 text-white/90">
            <li>✓ The full question bank, with detailed explanations for every option</li>
            <li>✓ Missed questions come back on a spaced schedule until you&apos;ve got them</li>
            <li>✓ Timed 65-question mock exams and readiness analytics</li>
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link className="btn !bg-white !px-6 !py-3 !text-[#4338CA]" href={owner.userId || paymentsMode === "waitlist" ? "/pricing" : "/register?next=/pricing"}>
              {paymentsMode === "waitlist" ? "Get notified when passes launch" : `Get ${PASS_DAYS} days for $${(PASS_PRICE_CENTS / 100).toFixed(2)}`}
            </Link>
            {!owner.userId && <Link className="font-bold text-white underline underline-offset-4" href="/register?next=/dashboard">Or create a free account to save these results</Link>}
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn-primary" href={`/practice/${session.exam}`}>Start another session</Link>
          <Link className="btn-ghost" href="/dashboard">View analytics</Link>
        </div>
      )}

      <h2 className="mt-12 text-2xl font-extrabold">Review every question</h2>
      <p className="mt-1 text-soft">Mistakes are listed first. Open any question for the full reasoning, and flag the ones you&apos;re unsure about so they come back in review.</p>
      <div className="mt-5 space-y-3">
        {ordered.map(({ q, a }, i) => {
          const pub = toPublic(q, id);
          const fb = a || access.active ? feedbackFor(q, a?.picks ?? []) : null;
          return (
            <details key={q.id} className="card group p-5" open={i === 0 && !a?.correct}>
              <summary className="flex cursor-pointer list-none items-start gap-3">
                <span className={`pill mt-0.5 shrink-0 ${!a ? "bg-surface-2 text-muted" : a.correct ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>
                  {!a ? "Skipped" : a.correct ? "Correct" : "Missed"}
                </span>
                <span className="flex-1 font-semibold leading-snug">{q.prompt} <span className="font-normal text-muted">· {q.topic}</span></span>
                {flagged.has(q.id) && <span className="pill shrink-0 bg-warn-soft text-warn" aria-label="Flagged">🚩</span>}
              </summary>
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <QuestionMeta q={pub} />
                  <SessionFlagButton sessionId={id} questionId={q.id} initial={flagged.has(q.id)} />
                </div>
                <QuestionText q={pub} />
                {a || access.active ? (
                  <>
                    <div className="mt-4"><OptionList q={pub} picks={a?.picks ?? []} feedback={fb} /></div>
                    <ExplanationPanel feedback={fb!} />
                    <ReportQuestion questionId={q.id} />
                  </>
                ) : (
                  <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-soft">You skipped this one. Answer it in a session to unlock its explanation.</p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
