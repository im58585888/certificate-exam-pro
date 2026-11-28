"use client";

import { useState, useTransition } from "react";
import { addNoteAction, editNoteAction, moveItemAction, removeItemAction, type NotebookResult } from "@/app/study/actions";
import { ChatMarkdown } from "./ChatMarkdown";
import { Mia } from "./Mia";

// Saved notes on the study sheet: tutor answers saved from Mia, and the learner's own notes. Each is filed under an
// exam topic or one of the learner's own topics; "Move to…" refiles it.

export interface SheetItem {
  id: number;
  kind: "clip" | "note";
  title: string | null;
  body: string;
  sourceQuestion: string | null;
  savedOn: string;
  /** "t:<exam topic>" or "s:<own topic id>". */
  where: string;
}

export type Target = { topic?: string; sectionId?: number };

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<NotebookResult>, onOk?: () => void) => start(async () => {
    setError(null);
    const r = await fn();
    if (r.ok) onOk?.(); else setError(r.error);
  });
  return { pending, error, run };
}

export function ItemCard({ item, destinations }: { item: SheetItem; destinations: { value: string; label: string }[] }) {
  const [removed, setRemoved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.body);
  const { pending, error, run } = useAction();
  const isNote = item.kind === "note";

  if (removed) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2 text-sm text-muted">
        Removed.
        <button className="font-bold text-brand" disabled={pending} onClick={() => run(() => removeItemAction(item.id, true), () => setRemoved(false))}>Undo</button>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${isNote ? "border-warn/40 bg-warn-soft" : "border-line bg-bg"}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`font-bold ${isNote ? "text-warn" : "text-brand"}`}>{isNote ? "📝 My note" : <span className="inline-flex items-center gap-1.5"><Mia size={16} />Saved from Mia</span>}</span>
        <span className="flex-1" />
        <select aria-label="Move to another topic" className="max-w-40 rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs text-soft" value={item.where} disabled={pending}
          onChange={(e) => { const v = e.target.value; run(() => moveItemAction(item.id, v.startsWith("s:") ? { sectionId: Number(v.slice(2)) } : { topic: v.slice(2) })); }}>
          {destinations.map((d) => <option key={d.value} value={d.value}>{d.value === item.where ? `Filed under ${d.label}` : `Move to ${d.label}`}</option>)}
        </select>
        {isNote && !editing && <button className="font-bold text-soft hover:text-brand" onClick={() => setEditing(true)}>Edit</button>}
        <button aria-label="Remove" title="Remove" className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-bad" disabled={pending}
          onClick={() => run(() => removeItemAction(item.id), () => setRemoved(true))}>✕</button>
      </div>
      {!isNote && item.title && <p className="mt-1.5 text-sm font-extrabold">{item.title}</p>}
      <div className="mt-2 text-sm">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); run(() => editNoteAction(item.id, draft), () => setEditing(false)); }}>
            <textarea className="input min-h-20 text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} autoFocus />
            <div className="mt-2 flex gap-2">
              <button className="btn-primary !px-3 !py-1 !text-xs" disabled={pending}>Save</button>
              <button type="button" className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => { setEditing(false); setDraft(item.body); }}>Cancel</button>
            </div>
          </form>
        ) : isNote ? <p className="whitespace-pre-wrap">{item.body}</p> : <ChatMarkdown text={item.body} />}
      </div>
      {!isNote && <p className="mt-2 text-[11px] text-muted">{item.sourceQuestion ? `From practice question ${item.sourceQuestion}` : "From the study sheet"} · {item.savedOn}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-bad">{error}</p>}
    </div>
  );
}

export function AddNote({ exam, target }: { exam: string; target: Target }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { pending, error, run } = useAction();
  if (!open) return <button className="text-xs font-bold text-soft hover:text-brand" onClick={() => setOpen(true)}>+ Add note</button>;
  return (
    <form className="rounded-xl border border-warn/40 bg-warn-soft p-2.5" onSubmit={(e) => { e.preventDefault(); run(() => addNoteAction({ exam, target, body: text }), () => { setText(""); setOpen(false); }); }}>
      <textarea className="input min-h-16 text-sm" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} autoFocus placeholder="In your own words: what to remember, a trap to avoid…" />
      <div className="mt-2 flex items-center gap-2">
        <button className="btn-primary !px-3 !py-1 !text-xs" disabled={pending || !text.trim()}>Add note</button>
        <button type="button" className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => setOpen(false)}>Cancel</button>
        {error && <span className="text-xs font-semibold text-bad">{error}</span>}
      </div>
    </form>
  );
}
