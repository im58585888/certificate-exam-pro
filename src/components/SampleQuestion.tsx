import { DOMAIN_SHORT, EXAMS } from "@/lib/exams";
import { solutionDiagram } from "@/lib/diagrams";
import { statusNotesFor } from "@/lib/lifecycle";
import type { Question } from "@/lib/questions";
import { ArchFigure } from "./ArchDiagram";
import { StatusNotes } from "./StatusNotes";

// A public practice question with its full explanation behind a "Show answer" toggle. The answer is in the HTML, so
// search engines and AI assistants can read it, but visitors try the question first.
export function SampleQuestion({ q, n, exam, showExam = false }: { q: Question; n: number; exam: string; showExam?: boolean }) {
  const right = q.options.filter((o) => o.correct);
  const notes = statusNotesFor(q, exam);
  const diagram = solutionDiagram(q);
  return (
    <li className="card p-5">
      <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
        <span>Question {n}</span>
        {showExam && <span className="pill bg-brand text-on-brand">{EXAMS[exam]?.code}</span>}
        <span className="pill bg-brand-soft text-brand">{DOMAIN_SHORT[q.domain] ?? q.domain}</span>
        <span className="pill bg-surface-2 text-soft">{q.topic}</span>
      </p>
      <p className="mt-3 leading-relaxed">{q.stem}</p>
      <p className="mt-2 font-bold">{q.prompt}{q.type === "multi" ? ` (Select ${q.selectCount ?? 2}.)` : ""}</p>
      <ul className="mt-3 grid gap-1.5">
        {q.options.map((o) => (
          <li key={o.key} className="flex gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-[15px]"><b className="text-muted">{o.key}.</b><span>{o.text}</span></li>
        ))}
      </ul>
      <details className="group mt-3">
        <summary className="cursor-pointer font-bold text-brand">Show answer and explanation</summary>
        <div className="mt-3 rounded-xl bg-ok-soft p-4">
          <p className="font-extrabold text-ok">Answer: {right.map((o) => `${o.key}. ${o.text}`).join("; ")}</p>
          <p className="mt-1.5 text-[15px]">{q.explanation.answer}</p>
        </div>
        {diagram && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-bold">Picture the solution</p>
            <ArchFigure diagram={diagram} />
          </div>
        )}
        <ul className="mt-3 grid gap-2 text-[15px]">
          {q.options.filter((o) => !o.correct).map((o) => (
            <li key={o.key}><b>Why not {o.key}?</b> <span className="text-soft">{o.why}</span></li>
          ))}
        </ul>
        {q.explanation.examTip && <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm"><b>Exam tip:</b> {q.explanation.examTip}</p>}
        {notes.length > 0 && <div className="mt-3"><StatusNotes notes={notes} /></div>}
        {q.explanation.references.length > 0 && (
          <p className="mt-3 text-sm text-soft">AWS docs: {q.explanation.references.map((r, i) => (
            <span key={r.url}>{i > 0 && " · "}<a href={r.url} className="text-brand hover:underline" target="_blank" rel="noopener">{r.title}</a></span>
          ))}</p>
        )}
      </details>
    </li>
  );
}
