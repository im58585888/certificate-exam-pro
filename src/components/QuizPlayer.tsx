"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { finishQuizAction, keepFlagAction, saveQuizAction, setFlagAction, submitAnswerAction } from "@/app/actions";
import type { Mode } from "@/lib/engine";
import type { Feedback, PublicQuestion } from "@/lib/questions";
import { ExplanationPanel, OptionList, QuestionMeta, QuestionText, Verdict } from "./QuestionParts";
import { Fireworks, useCelebrationSound } from "./Fireworks";
import { FlagButton } from "./FlagButton";
import { ReportQuestion } from "./ReportQuestion";
import type { SheetAccess } from "@/lib/sheetAccess";
import { MiaPanel } from "./Tutor";
import { markNudgeSeen, nudgeSeen, OfferCard, OfferNudge, SignupNudge, type TrialOffer } from "./TrialNudges";
import { trialNudgeShownAction } from "@/app/actions";

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
  /** Exam code shown in the paywall, e.g. "AIF-C01". */
  examCode: string;
  /** Whether the AI tutor is switched on. */
  tutor: boolean;
  /** Paid, signed-in sessions can be saved and resumed later (a mock exam's clock pauses while saved). */
  canSave?: boolean;
  /** Study sheet saving: pass holders can save; others see the button as an upsell. */
  sheetAccess: SheetAccess;
  /** Question to open on (coming back from the study sheet); otherwise the first unanswered one. */
  startAt?: string;
  /** Free trial only: the half-price offer and sign-up pop-ups. */
  trialOffer?: TrialOffer;
}

const MODE_LABEL: Record<Mode, string> = { trial: "Free trial", practice: "Practice", reinforce: "Strengthen weak areas", review: "Review mistakes", flagged: "Flagged questions", exam: "Timed mock exam" };

function formatClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
}

export function QuizPlayer({ sessionId, mode, questions, initialFlags, initial, deadline, signedIn, waitlist, examCode, tutor, canSave, sheetAccess, startAt, trialOffer }: QuizPlayerProps) {
  const isExam = mode === "exam";
  const [answers, setAnswers] = useState(initial);
  const [index, setIndex] = useState(() => {
    const asked = startAt ? questions.findIndex((q) => q.id === startAt) : -1;
    return asked >= 0 ? asked : Math.max(0, questions.findIndex((q) => !initial[q.id]));
  });
  const [draft, setDraft] = useState<string[]>(() => initial[questions[index]?.id]?.picks ?? []);
  const [flags, setFlags] = useState<Set<string>>(() => new Set(initialFlags));
  const [stillWeak, setStillWeak] = useState<string | null>(null); // question id showing the "still weak?" prompt
  const [paywall, setPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0); // bumps on each correct practice answer to launch fireworks
  const [sound, toggleSound] = useCelebrationSound();
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
  const mia = tutor && !isExam;
  // Mia's panel is 80% as tall as the question card (wide screens), so it follows the card as it grows or shrinks.
  const cardRef = useRef<HTMLElement>(null);
  const [cardHeight, setCardHeight] = useState(0);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = new ResizeObserver(() => setCardHeight(el.offsetHeight));
    measure.observe(el);
    return () => measure.disconnect();
  }, []);

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
    if (res.status === "graded" && res.feedback.correct) setCelebrate((n) => n + 1);
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

  const saveForLater = () => startTransition(async () => {
    if (!(await saveExamDraft())) return;
    const r = await saveQuizAction(sessionId);
    if (r?.error) setError(r.error);
  });

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
  // Free trial: after question 2 a sign-up pop-up; after question 3 (if they skipped it) the half-price offer. Once each.
  const [nudge, setNudge] = useState<null | "signup" | "offer">(null);
  const showNudge = (k: "signup" | "offer") => {
    markNudgeSeen(k);
    setNudge(k);
    trialNudgeShownAction(k === "signup" ? "nudge_signup" : "nudge_offer").catch(() => {});
  };
  const maybeNudge = () => {
    if (mode !== "trial" || !trialOffer) return;
    const done = Object.keys(answers).length;
    if (!signedIn && done >= 2 && !nudgeSeen("signup")) showNudge("signup");
    else if (trialOffer.eligible && done >= 3 && !nudgeSeen("offer") && (signedIn || nudgeSeen("signup"))) showNudge("offer");
  };

  const next = () => startTransition(async () => {
    if (!(await saveExamDraft())) return;
    if (isLast) { if (!isExam) finish(); } else { go(index + 1); maybeNudge(); }
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
    <div ref={topRef} className={`mx-auto grid gap-5 px-4 py-6 ${mia ? "max-w-7xl pb-24 lg:grid-cols-[minmax(0,1fr)_400px] lg:pb-6" : "max-w-4xl"}`}>
      {!isExam && <Fireworks trigger={celebrate} sound={sound} />}
      <section ref={cardRef} className="card min-w-0 p-5 md:p-7" aria-live="polite">
        {/* Session controls in one slim bar above the progress bar, so Mia can have the whole right column. */}
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-line pb-4">
          <p className="text-sm whitespace-nowrap">
            <span className="eyebrow mr-2">{MODE_LABEL[mode]}</span>
            <b>{answeredCount}</b> <span className="text-soft">answered</span>
            {!isExam && answeredCount > 0 && <> · <b>{Math.round((correctSoFar / answeredCount) * 100)}%</b> <span className="text-soft">right</span></>}
          </p>
          <div className="order-last flex w-full gap-1 overflow-x-auto p-1 [scrollbar-width:thin]" role="list" aria-label="Questions">
            {questions.map((x, i) => {
              const a = answers[x.id];
              const tone = !a ? "bg-surface text-soft border-line" : isExam ? "bg-brand-soft text-brand border-transparent" : a.feedback?.correct ? "bg-ok-soft text-ok border-transparent" : "bg-bad-soft text-bad border-transparent";
              return (
                <button key={x.id} role="listitem" onClick={() => jump(i)} disabled={pending}
                  aria-label={`Question ${i + 1}${flags.has(x.id) ? ", flagged" : ""}`} aria-current={i === index ? "step" : undefined}
                  className={`relative h-7 min-w-7 flex-none rounded-md border px-1 text-xs font-bold ${tone} ${i === index ? "outline-2 outline-offset-1 outline-brand" : ""}`}>
                  {i + 1}
                  {flags.has(x.id) && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-warn" />}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {canSave && (
              <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={saveForLater} disabled={pending}
                title={isExam ? "Your answers are kept and the clock pauses until you come back." : "Your answers are kept. Resume any time from your dashboard."}>
                <span aria-hidden>💾</span> Save &amp; finish later
              </button>
            )}
            {!isExam && answeredCount > 0 && <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={finish} disabled={pending}>End session</button>}
            {!isExam && (
              <button type="button" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Celebration sound on" : "Celebration sound off"}
                title={sound ? "Celebration sound on" : "Celebration sound off"} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm hover:border-brand">
                {sound ? "🔊" : "🔇"}
              </button>
            )}
            <button type="button" title="Keyboard: press 1–5 to choose, Enter to check, F to flag." aria-label="Keyboard tips: press 1 to 5 to choose, Enter to check, F to flag."
              className="hidden h-8 w-8 place-items-center rounded-lg border border-line text-xs font-bold text-soft hover:border-brand sm:grid">?</button>
          </div>
          {flags.size > 0 && (
            <p className="flex w-full items-center gap-2 text-xs text-muted">
              <span className="h-2 w-2 rounded-full bg-warn" aria-hidden /> {flags.size} flagged{isExam ? ": jump back before submitting" : ""}
            </p>
          )}
        </div>

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

        <div data-quiz-actions className="mt-6 flex flex-wrap items-center justify-between gap-3">
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

      {/* Mia fills the right column (sticky on wide screens; a floating button and sheet on phones). Not in mock exams. */}
      {mia && (
        <MiaPanel key={q.id} sessionId={sessionId} questionId={q.id} questionNumber={index + 1} answered={!!feedback}
          sheetAccess={sheetAccess} backHref={`/quiz/${sessionId}?q=${encodeURIComponent(q.id)}`}
          height={cardHeight ? Math.round(cardHeight * 0.8) : undefined} />
      )}

      {nudge === "signup" && trialOffer && (
        <SignupNudge answered={Object.keys(answers).length} correct={correctSoFar} google={trialOffer.google}
          back={`/quiz/${sessionId}?q=${encodeURIComponent(q.id)}`} onClose={() => setNudge(null)} />
      )}
      {nudge === "offer" && trialOffer && <OfferNudge offer={trialOffer} signedIn={signedIn} onClose={() => setNudge(null)} />}

      {paywall && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="pw-title">
          <div className="card max-w-md p-7 text-center">
            <h2 id="pw-title" className="text-2xl font-extrabold">You&apos;ve used your free {examCode} questions</h2>
            {trialOffer?.eligible ? (
              <div className="mt-4">
                <OfferCard offer={trialOffer} signedIn={signedIn} compact />
                <button className="btn-ghost mt-3 w-full" onClick={finish}>See my trial results</button>
              </div>
            ) : (
              <>
                <p className="mt-2 text-soft">Unlock unlimited practice, timed mock exams, adaptive review of your mistakes and full analytics for 30 days.</p>
                <div className="mt-5 flex flex-col gap-2">
                  <Link className="btn-primary !py-3" href={waitlist || signedIn ? "/pricing" : "/register?next=/pricing"}>{waitlist ? "Get notified when passes launch" : `Unlock ${examCode} for $9.99`}</Link>
                  <button className="btn-ghost" onClick={finish}>See my trial results</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
