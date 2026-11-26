import type { StatusNote } from "@/lib/lifecycle";

// Dated AWS lifecycle notes ("closed to new customers", "renamed") shown with an explanation, so a learner who sees an
// older service name knows what changed and whether the exam still covers it.
export function StatusNotes({ notes }: { notes?: StatusNote[] }) {
  if (!notes?.length) return null;
  return (
    <section className="rounded-xl border border-line bg-surface-2 px-4 py-3" aria-label="AWS status updates">
      <h3 className="eyebrow">AWS status update</h3>
      <ul className="mt-2 grid gap-3">
        {notes.map((n) => {
          const examNote = n.exam ? Object.values(n.exam)[0] : undefined;
          return (
            <li key={n.id} className="text-[15px] leading-relaxed">
              <p><b>{n.service}</b> <span className="pill bg-warn-soft text-warn">{n.label}</span></p>
              <p className="mt-1 text-soft">{n.text}</p>
              {examNote && <p className="mt-1"><b>For the exam:</b> <span className="text-soft">{examNote}</span></p>}
              <a className="mt-1 inline-block text-sm text-brand underline-offset-2 hover:underline" href={n.source.url} target="_blank" rel="noopener noreferrer">Source: {n.source.title}</a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
