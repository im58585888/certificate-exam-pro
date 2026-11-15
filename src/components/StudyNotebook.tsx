"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import {
  addNoteAction, createSectionAction, deleteSectionAction, editNoteAction, moveItemAction, removeItemAction,
  renameSectionAction, setCardHiddenAction, type NotebookResult,
} from "@/app/study/actions";
import { ChatMarkdown } from "./ChatMarkdown";
import { ChatThread, streamPost } from "./Tutor";

// Interactive pieces of the study sheet. The page itself is server-rendered; these call the notebook actions.

export interface SheetItem {
  id: number;
  kind: "clip" | "note";
  title: string | null;
  body: string;
  sourceQuestion: string | null;
  sectionId: number | null;
  savedOn: string;
}

export interface SectionRef { id: number; name: string }

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

/** A saved tutor clip or a note, with move / remove (and edit for notes). Removing leaves an Undo in its place. */
export function ItemCard({ item, sections, signedIn }: { item: SheetItem; sections: SectionRef[]; signedIn: boolean }) {
  const [removed, setRemoved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.body);
  const { pending, error, run } = useAction();
  const isNote = item.kind === "note";

  if (removed) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2 text-sm text-muted">
        Removed from your sheet.
        <button className="font-bold text-brand" disabled={pending} onClick={() => run(() => removeItemAction(item.id, true), () => setRemoved(false))}>Undo</button>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${isNote ? "border-warn/40 bg-warn-soft" : "border-line bg-bg"}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`font-bold ${isNote ? "text-warn" : "text-brand"}`}>{isNote ? "📝 My note" : "📌 Saved"}</span>
        <span className="flex-1" />
        {signedIn && (
          <span className="flex items-center gap-1.5">
            {sections.length > 0 && (
              <select aria-label="Move to section" className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs text-soft" value={item.sectionId ?? ""} disabled={pending}
                onChange={(e) => run(() => moveItemAction(item.id, e.target.value ? Number(e.target.value) : null))}>
                <option value="">{item.sectionId ? "Move back to its topic" : "Move to section…"}</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {isNote && !editing && <button className="font-bold text-soft hover:text-brand" onClick={() => setEditing(true)}>Edit</button>}
            <button aria-label="Remove from study sheet" title="Remove" className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-bad" disabled={pending}
              onClick={() => run(() => removeItemAction(item.id), () => setRemoved(true))}>✕</button>
          </span>
        )}
      </div>
      {!isNote && item.title && <p className="mt-1.5 text-sm font-extrabold text-ink">{item.title}</p>}
      <div className="mt-2 text-sm">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); run(() => editNoteAction(item.id, draft), () => setEditing(false)); }}>
            <textarea className="input min-h-20 text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} autoFocus />
            <div className="mt-2 flex gap-2">
              <button className="btn-primary !px-3 !py-1 !text-xs" disabled={pending}>Save</button>
              <button type="button" className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => { setEditing(false); setDraft(item.body); }}>Cancel</button>
            </div>
          </form>
        ) : isNote ? <p className="whitespace-pre-wrap text-ink">{item.body}</p> : <ChatMarkdown text={item.body} />}
      </div>
      {!isNote && item.sourceQuestion && <p className="mt-2 text-[11px] text-muted">From practice question {item.sourceQuestion} · {item.savedOn}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-bad">{error}</p>}
    </div>
  );
}

/** "+ Add note" that expands into a small editor. */
export function AddNote({ exam, topic, domain, sectionId, signedIn }: { exam: string; topic?: string; domain?: string; sectionId?: number; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { pending, error, run } = useAction();
  if (!signedIn) return null;
  if (!open) return <button className="text-xs font-bold text-soft hover:text-brand" onClick={() => setOpen(true)}>+ Add note</button>;
  return (
    <form className="rounded-xl border border-warn/40 bg-warn-soft p-2.5" onSubmit={(e) => { e.preventDefault(); run(() => addNoteAction({ exam, topic, domain, sectionId, body: text }), () => { setText(""); setOpen(false); }); }}>
      <textarea className="input min-h-16 text-sm" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} autoFocus placeholder="In your own words: what to remember, a trap to avoid…" />
      <div className="mt-2 flex items-center gap-2">
        <button className="btn-primary !px-3 !py-1 !text-xs" disabled={pending || !text.trim()}>Add note</button>
        <button type="button" className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => setOpen(false)}>Cancel</button>
        {error && <span className="text-xs font-semibold text-bad">{error}</span>}
      </div>
    </form>
  );
}

/** The auto concept card with a remove (hide) control; hidden cards collapse to a one-line restore. */
export function ConceptCardSlot({ exam, topic, hidden, signedIn, children }: { exam: string; topic: string; hidden: boolean; signedIn: boolean; children: ReactNode }) {
  const [isHidden, setHidden] = useState(hidden);
  const { pending, run } = useAction();
  if (isHidden) {
    return (
      <p className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted">
        Concept card hidden.
        <button className="font-bold text-brand" disabled={pending} onClick={() => run(() => setCardHiddenAction(exam, topic, false), () => setHidden(false))}>Show it</button>
      </p>
    );
  }
  return (
    <div className="relative">
      {signedIn && (
        <button aria-label="Hide this concept card" title="Hide concept card" className="absolute -top-1 right-0 grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-bad" disabled={pending}
          onClick={() => run(() => setCardHiddenAction(exam, topic, true), () => setHidden(true))}>✕</button>
      )}
      <div className="pr-6">{children}</div>
    </div>
  );
}

export function NewSection({ exam }: { exam: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { pending, error, run } = useAction();
  if (!open) return <button className="btn-ghost" onClick={() => setOpen(true)}>+ Section</button>;
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); run(() => createSectionAction(exam, name), () => { setName(""); setOpen(false); }); }}>
      <input className="input !w-56 !py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus placeholder="Databases compared" aria-label="Section name" />
      <button className="btn-primary !py-1.5" disabled={pending || !name.trim()}>Create</button>
      <button type="button" className="btn-ghost !py-1.5" onClick={() => setOpen(false)}>Cancel</button>
      {error && <span className="text-xs font-semibold text-bad">{error}</span>}
    </form>
  );
}

export function SectionHeader({ section }: { section: SectionRef }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(section.name);
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {renaming ? (
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); run(() => renameSectionAction(section.id, name), () => setRenaming(false)); }}>
          <input className="input !w-56 !py-1 text-sm" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus aria-label="Section name" />
          <button className="btn-primary !px-3 !py-1 !text-xs" disabled={pending}>Save</button>
        </form>
      ) : <h2 className="text-lg font-extrabold">📁 {section.name}</h2>}
      <span className="ml-auto flex gap-3 text-xs font-bold text-soft">
        {!renaming && <button className="hover:text-brand" onClick={() => setRenaming(true)}>Rename</button>}
        <button className="hover:text-bad" disabled={pending}
          onClick={() => { if (confirm(`Delete "${section.name}"? Its items move back to their topics.`)) run(() => deleteSectionAction(section.id)); }}>Delete section</button>
      </span>
      {error && <p className="w-full text-xs font-semibold text-bad">{error}</p>}
    </div>
  );
}

/** The study sheet's tutor: a side panel on wide screens, a bottom sheet behind a button on phones. */
export function StudyTutor({ exam, examCode, access, signedIn, suggestions }: {
  exam: string; examCode: string; access: "ok" | "no-pass" | "signed-out" | "off"; signedIn: boolean; suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const body = access === "ok" ? (
    <ChatThread suggestions={suggestions} signedIn={signedIn} saveTarget={{ exam }}
      placeholder="Ask about any topic, or ask for a table or diagram…"
      emptyHint={<p className="mt-1 text-sm text-soft">Ask about any {examCode} topic. Ask for comparisons, diagrams or a quick quiz, and save the useful answers to your sheet.</p>}
      send={(turns, onText) => streamPost("/api/ai/study-chat", { exam, turns }, onText)} />
  ) : (
    <div className="text-sm text-soft">
      {access === "off" ? <p>The AI tutor is switched off right now.</p> : (
        <>
          <p>Chat with the tutor about any {examCode} topic: compare services, draw how things connect, or get quizzed on your weak spots, then save the answers here.</p>
          <Link className="btn-primary mt-3" href={access === "signed-out" ? "/register?next=/pricing" : "/pricing"}>{access === "signed-out" ? "Create an account" : `Get the ${examCode} pass`}</Link>
          <p className="mt-2 text-xs text-muted">The study tutor is part of the exam pass.</p>
        </>
      )}
    </div>
  );
  const title = <p className="flex items-center gap-2 font-extrabold"><span aria-hidden>✨</span> Study tutor</p>;

  return (
    <>
      <aside className="card hidden h-fit max-h-[calc(100vh-2rem)] overflow-y-auto p-5 lg:sticky lg:top-4 lg:block">
        {title}
        <div className="mt-3">{body}</div>
      </aside>
      <div className="lg:hidden">
        {!open && (
          <button className="btn-primary fixed right-4 bottom-4 z-40 shadow-lg" onClick={() => setOpen(true)}>✨ Ask the tutor</button>
        )}
        {open && (
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-5 shadow-2xl" role="dialog" aria-label="Study tutor">
            <div className="flex items-center justify-between">{title}<button className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => setOpen(false)}>Close</button></div>
            <div className="mt-3">{body}</div>
          </div>
        )}
      </div>
    </>
  );
}
