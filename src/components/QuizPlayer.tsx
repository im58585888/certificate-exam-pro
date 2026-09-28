"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { finishQuizAction, keepFlagAction, setFlagAction, submitAnswerAction } from "@/app/actions";
import type { Mode } from "@/lib/engine";
import type { Feedback, PublicQuestion } from "@/lib/questions";
import { ExplanationPanel, OptionList, QuestionMeta, QuestionText, Verdict } from "./QuestionParts";
import { FlagButton } from "./FlagButton";
import { ReportQuestion } from "./ReportQuestion";

export interface QuizPlayerProps {
  sessionId: string;
  mode: Mode;
  questions: PublicQuestion[];
  /** Questions in this session the visitor has flagged as weak. */
  initialFlags: string[];
  initial: Record<string, { picks: string[]; feedback?: Feedback }>;
  deadline: number | null;
  signedIn: boolean;
  waitlist?: boolean;
}

const MODE_LABEL: Record<Mode, string> = { trial: "Free trial", practice: "Practice", reinforce: "Strengthen weak areas", review: "Review mistakes", flagged: "Flagged questions", exam: "Timed mock exam" };

function formatClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
}

export function QuizPlayer({ sessionId, mode, questions, initialFlags, initial, deadline, signedIn, waitlist }: QuizPlayerProps) {
  const isExam = mode === "exam";
  const [answers, setAnswers] = useState(initial);
  const [index, setIndex] = useState(() => Math.max(0, questions.findIndex((q) => !initial[q.id])));
  const [draft, setDraft] = useState<string[]>(() => initial[questions[Math.max(0, questions.findIndex((q) => !initial[q.id]))]?.id]?.picks ?? []);
  const [flags, setFlags] = useState<Set<string>>(() => new Set(initialFlags));
  const [stillWeak, setStillWeak] = useState<string | null>(null); // question id showing the "still weak?" prompt
  const [paywall, setPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const shownAt = useRef(0);
  const topRef = useRef<HTMLDivElement>(null);

  const q = questions[index];
  const saved = answers[q.id];
  const feedback = isExam ? null : saved?.feedback ?? null;
  const picks = feedback ? saved!.picks : draft;
  const answeredCount = Object.keys(answers).length;
  const complete = draft.length === q.selectCount;
  const isLast = index === questions.length - 1;

  const go = useCallback((i: number) => {
    setIndex(i);
    setDraft(answers[questions[i].id]?.picks ?? []);
    setError(null);
    shownAt.current = Date.now();
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [answers, questions]);

  const submit = useCallback(async (qid: string, p: string[]) => {
    const res = await submitAnswerAction(sessionId, qid, p, Date.now() - shownAt.current);
    if (res.status === "paywall") { setPaywall(true); return false; }
    if (res.status === "error") { setError(res.message); return false; }
    setAnswers((a) => ({ ...a, [qid]: { picks: p, feedback: res.status === "graded" ? res.feedback : undefined } }));
    if (res.status === "graded" && res.flagPrompt) setStillWeak(qid);
    return true;
  }, [sessionId]);

  const finish = useCallback(() => startTransition(() => finishQuizAction(sessionId)), [sessionId]);

  // Exam mode: persist the current selection when moving away from a question.
  const saveExamDraft = useCallback(async () => {
    if (!isExam || draft.length !== q.selectCount) return true;
    const prev = answers[q.id]?.picks;
    if (prev && prev.length === draft.length && prev.every((k) => draft.includes(k))) return true;
    return submit(q.id, draft);
  }, [isExam, draft, q, answers, submit]);

  // Optimistic: the flag shows immediately and rolls back if the server refuses.
  const setFlag = useCallback((qid: string, on: boolean) => {
    const apply = (v: boolean) => setFlags((f) => { const n = new Set(f); if (v) n.add(qid); else n.delete(qid); return n; });
    apply(on);
    setFlagAction(sessionId, qid, on).then((r) => { if (!r.ok) apply(!on); }, () => apply(!on));
  }, [sessionId]);

  const toggle = (key: string) => {
    setError(null);
    if (q.type === "single") return setDraft([key]);
    setDraft((d) => (d.includes(key) ? d.filter((k) => k !== key) : d.length < q.selectCount ? [...d, key] : d));
  };

  const check = () => startTransition(async () => { await submit(q.id, draft); });
  const next = () => startTransition(async () => {
    if (!(await saveExamDraft())) return;
    if (isLast) { if (!isExam) finish(); } else go(index + 1);
  });
  const jump = (i: number) => startTransition(async () => { if (await saveExamDraft()) go(i); });

  // Start timing the first question once mounted (go() resets it for later questions).
  useEffect(() => { shownAt.current = Date.now(); }, []);

  // Exam clock
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  const remaining = deadline ? deadline - now : null;
  useEffect(() => {
    if (remaining !== null && remaining <= 0) startTransition(async () => { await saveExamDraft(); finish(); });
  }, [remaining, saveExamDraft, finish]);

  // Keyboard: 1–5 choose, Enter checks/advances.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey || pending || paywall) return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length && !feedback) toggle(q.options[n - 1].key);
      if (e.key === "f" || e.key === "F") setFlag(q.id, !flags.has(q.id));
      if (e.key === "Enter") {
        if (feedback || isExam) next();
        else if (complete) check();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const correctSoFar = Object.values(answers).filter((a) => a.feedback?.correct).length;

  return (
    <div ref={topRef} className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="card p-5 md:p-7" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold whitespace-nowrap text-soft">{index + 1}/{questions.length}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
          </div>
          {remaining !== null && (
            <span className={`pill tabular-nums ${remaining < 10 * 60000 ? "bg-bad-soft text-bad" : "bg-surface-2 text-soft"}`}>{formatClock(remaining)}</span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-2">
          <QuestionMeta q={q} />
          <FlagButton flagged={flags.has(q.id)} onChange={(on) => setFlag(q.id, on)} />
        </div>
        <QuestionText q={q} />
        {feedback && <div className="mt-4"><Verdict correct={feedback.correct} /></div>}
        <div className="mt-4"><OptionList q={q} picks={picks} feedback={feedback} onToggle={toggle} disabled={pending} /></div>
        {feedback && stillWeak === q.id && flags.has(q.id) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warn-soft px-4 py-3 text-sm">
            <p className="font-semibold text-warn">You&apos;ve now answered this flagged question correctly twice in a row. Still weak?</p>
            <div className="flex gap-2">
              <button className="btn-ghost !py-1.5" onClick={() => { keepFlagAction(sessionId, q.id); setStillWeak(null); }}>Keep flag</button>
              <button className="btn-primary !py-1.5" onClick={() => { setFlag(q.id, false); setStillWeak(null); }}>Clear flag</button>
            </div>
          </div>
        )}
        {feedback && <ExplanationPanel feedback={feedback} />}
        {feedback && <ReportQuestion key={q.id} questionId={q.id} />}
        {error && <p className="mt-4 rounded-xl bg-bad-soft px-4 py-2 text-sm font-semibold text-bad">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => jump(index - 1)} disabled={index === 0 || pending}>Previous</button>
          </div>
          {isExam ? (
            <div className="flex gap-2">
              {!isLast && <button className="btn-primary" onClick={next} disabled={pending}>Next</button>}
              <button className={isLast ? "btn-primary" : "btn-ghost"} disabled={pending} onClick={() => {
                const left = questions.length - Object.keys(answers).length - (draft.length === q.selectCount && !answers[q.id] ? 1 : 0);
                if (left > 0 && !confirm(`${left} question${left > 1 ? "s are" : " is"} unanswered. Submit the exam anyway?`)) return;
                startTransition(async () => { if (await saveExamDraft()) finish(); });
              }}>Submit exam</button>
            </div>
          ) : feedback ? (
            <button className="btn-primary" onClick={next} disabled={pending}>{isLast ? "See results" : "Next question"}</button>
          ) : (
            <button className="btn-primary" onClick={check} disabled={!complete || pending}>{pending ? "Checking…" : "Check answer"}</button>
          )}
        </div>
      </section>

      <aside className="card h-fit p-5 lg:sticky lg:top-4">
        <p className="eyebrow">{MODE_LABEL[mode]}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-line p-3"><b className="block text-xl">{answeredCount}</b><span className="text-xs text-muted">Answered</span></div>
          <div className="rounded-xl border border-line p-3">
            <b className="block text-xl">{isExam ? "–" : answeredCount ? `${Math.round((correctSoFar / answeredCount) * 100)}%` : "–"}</b>
            <span className="text-xs text-muted">{isExam ? "Scored at the end" : "Accuracy"}</span>
          </div>
        </div>
        <p className="eyebrow mt-5">Questions</p>
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(34px,1fr))] gap-1.5">
          {questions.map((x, i) => {
            const a = answers[x.id];
            const tone = !a ? "bg-surface text-soft border-line" : isExam ? "bg-brand-soft text-brand border-transparent" : a.feedback?.correct ? "bg-ok-soft text-ok border-transparent" : "bg-bad-soft text-bad border-transparent";
            return (
              <button key={x.id} onClick={() => jump(i)} disabled={pending}
                aria-label={`Question ${i + 1}${flags.has(x.id) ? ", flagged" : ""}`}
                className={`relative h-[34px] rounded-lg border text-xs font-bold ${tone} ${i === index ? "outline-2 outline-offset-1 outline-brand" : ""}`}>
                {i + 1}
                {flags.has(x.id) && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-warn" />}
              </button>
            );
          })}
        </div>
        {!isExam && answeredCount > 0 && (
          <button className="btn-ghost mt-5 w-full" onClick={finish} disabled={pending}>End session &amp; see results</button>
        )}
        {flags.size > 0 && (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-full bg-warn" aria-hidden /> {flags.size} flagged{isExam ? ": jump back before submitting" : ""}
          </p>
        )}
        <p className="mt-4 text-xs text-muted">Tip: press 1–5 to choose, Enter to check, F to flag.</p>
      </aside>

      {paywall && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="pw-title">
          <div className="card max-w-md p-7 text-center">
            <h2 id="pw-title" className="text-2xl font-extrabold">You&apos;ve used your free questions</h2>
            <p className="mt-2 text-soft">Unlock unlimited practice, timed mock exams, adaptive review of your mistakes and full analytics for 30 days.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Link className="btn-primary !py-3" href={waitlist || signedIn ? "/pricing" : "/register?next=/pricing"}>{waitlist ? "Get notified when passes launch" : "Unlock all access for $9.99"}</Link>
              <button className="btn-ghost" onClick={finish}>See my trial results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
