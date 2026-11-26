import { DOMAIN_SHORT } from "@/lib/exams";
import type { Feedback, PublicQuestion } from "@/lib/questions";
import { fmtMonthYear } from "@/lib/changelog";
import { StatusNotes } from "./StatusNotes";

export const DOMAIN_LABEL = DOMAIN_SHORT;

const DIFF_CLASS: Record<string, string> = {
  easy: "bg-ok-soft text-ok",
  medium: "bg-warn-soft text-warn",
  hard: "bg-bad-soft text-bad",
};

export function QuestionMeta({ q }: { q: PublicQuestion }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="pill bg-brand-soft text-brand">{DOMAIN_LABEL[q.domain]}</span>
      <span className="pill bg-surface-2 text-soft">{q.topic}</span>
      <span className={`pill ${DIFF_CLASS[q.difficulty]}`}>{q.difficulty}</span>
    </div>
  );
}

export function QuestionText({ q }: { q: PublicQuestion }) {
  return (
    <>
      <p className="mt-4 leading-relaxed text-ink">{q.stem}</p>
      <p className="mt-3 font-bold leading-snug">{q.prompt}</p>
      <p className="mt-1 text-xs text-muted">{q.type === "multi" ? `Select ${q.selectCount}.` : "Select one."}</p>
    </>
  );
}

export function Verdict({ correct }: { correct: boolean }) {
  return correct ? (
    <div className="rounded-xl bg-ok-soft px-4 py-3 font-bold text-ok">Correct. Here&apos;s why, and why every other option falls short.</div>
  ) : (
    <div className="rounded-xl bg-bad-soft px-4 py-3 font-bold text-bad">Not quite. Your choice is marked in red, and each option explains the trap.</div>
  );
}

interface OptionListProps {
  q: PublicQuestion;
  picks: string[];
  feedback?: Feedback | null;
  onToggle?: (key: string) => void;
  disabled?: boolean;
}

/** Renders options; after grading, shows right/wrong styling and the per-option reasoning inline. */
export function OptionList({ q, picks, feedback, onToggle, disabled }: OptionListProps) {
  const why = new Map(feedback?.options.map((o) => [o.key, o.why]));
  return (
    <div className="grid gap-2.5" role={q.type === "multi" ? "group" : "radiogroup"}>
      {q.options.map((o, i) => {
        const picked = picks.includes(o.key);
        const right = feedback?.correctKeys.includes(o.key);
        let tone = "border-line bg-surface hover:border-brand";
        let box = "border-muted";
        let label = "";
        if (feedback) {
          if (right) { tone = "border-ok bg-ok-soft"; box = "border-ok bg-ok"; label = picked ? "Correct, and you chose it." : picks.length ? "Correct answer. You missed this one." : "Correct answer."; }
          else if (picked) { tone = "border-bad bg-bad-soft"; box = "border-bad bg-bad"; label = "Your choice. Incorrect."; }
          else { tone = "border-line bg-surface"; label = "Incorrect."; }
        } else if (picked) { tone = "border-brand bg-brand-soft"; box = "border-brand bg-brand"; }
        return (
          <button
            key={o.key}
            type="button"
            role={q.type === "multi" ? "checkbox" : "radio"}
            aria-checked={picked}
            disabled={disabled || !!feedback}
            onClick={onToggle ? () => onToggle(o.key) : undefined}
            className={`grid w-full grid-cols-[26px_1fr] items-start gap-3 rounded-xl border-[1.5px] p-3.5 text-left transition disabled:cursor-default ${tone}`}
          >
            <span className={`mt-0.5 grid h-[22px] w-[22px] place-items-center border-2 text-[0.7rem] font-extrabold text-white ${q.type === "multi" ? "rounded-md" : "rounded-full"} ${box}`}>
              {picked || (feedback && right) ? "" : <span className="text-muted">{String.fromCharCode(65 + i)}</span>}
            </span>
            <span className="font-semibold leading-snug">{o.text}</span>
            {feedback && (
              <span className="col-start-2 mt-1 border-t border-dashed border-line pt-2 text-sm leading-relaxed text-soft">
                <b className="text-ink">{label}</b> {why.get(o.key)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ExplanationPanel({ feedback }: { feedback: Feedback }) {
  const e = feedback.explanation;
  return (
    <div className="mt-6 space-y-5">
      <section>
        <h3 className="eyebrow">Why the answer is correct</h3>
        <p className="mt-1.5 leading-relaxed">{e.answer}</p>
      </section>
      <section>
        <h3 className="eyebrow">Core concept</h3>
        <p className="mt-1.5 leading-relaxed">{e.concept}</p>
      </section>
      <div className="rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">Exam tip: {e.examTip}</div>
      <StatusNotes notes={feedback.status} />
      <section>
        <h3 className="eyebrow">Read more on AWS docs</h3>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          {e.references.map((r) => (
            <li key={r.url}><a className="text-brand underline-offset-2 hover:underline" href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></li>
          ))}
        </ul>
      </section>
      {feedback.id && (
        <p className="text-xs text-muted">
          Question {feedback.id}{feedback.updated ? ` · Updated ${fmtMonthYear(feedback.updated)}` : ""} · <a href="/changelog" className="underline-offset-2 hover:underline">What changed</a>
        </p>
      )}
    </div>
  );
}
