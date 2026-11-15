"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import {
  addNoteAction, createSectionAction, deleteSectionAction, editNoteAction, moveItemAction, removeItemAction,
  renameSectionAction, setTopicPrefAction, type NotebookResult,
} from "@/app/study/actions";
import type { ConceptCard } from "@/lib/ai";
import { CardLoader } from "./CardLoader";
import { ChatMarkdown } from "./ChatMarkdown";
import { ConceptCardBody } from "./StudyCards";
import { ChatThread, streamPost } from "./Tutor";

// The study sheet (pass holders): a short "Study these next" row, then one collapsed line per topic. Everything else
// (summary, saved notes, mistakes, the tutor) lives inside a topic, one tab at a time, so the page stays tidy.

export interface SheetItem {
  id: number;
  kind: "clip" | "note";
  title: string | null;
  body: string;
  sourceQuestion: string | null;
  savedOn: string;
}

export interface SheetMistake { questionId: string; prompt: string; picked: string[]; correct: string[] }

export interface TopicView {
  /** "t:<exam topic>" or "s:<own topic id>". */
  key: string;
  name: string;
  topic?: string;
  sectionId?: number;
  domain?: string;
  practised: boolean;
  seen: number;
  missed: number;
  accuracy: number | null;
  pinned: boolean;
  hidden: boolean;
  card: ConceptCard | null;
  items: SheetItem[];
  mistakes: SheetMistake[];
}

type Target = { topic?: string; sectionId?: number };
const targetOf = (t: TopicView): Target => (t.sectionId ? { sectionId: t.sectionId } : { topic: t.topic });

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

/** Red: questions to fix. Amber: shaky. Green: solid. Grey: added but not practised yet. */
function tone(t: TopicView): { dot: string; label: string } {
  if (t.sectionId) return { dot: "bg-brand", label: "Your topic" };
  if (!t.practised) return { dot: "bg-line", label: "Not practised yet" };
  if (t.missed) return { dot: "bg-bad", label: `${t.missed} to fix` };
  if ((t.accuracy ?? 1) < 0.8) return { dot: "bg-warn", label: `${Math.round((t.accuracy ?? 0) * 100)}% right` };
  return { dot: "bg-ok", label: "All correct" };
}

const notesLabel = (n: number) => (n ? `${n} note${n === 1 ? "" : "s"}` : "");

export function StudySheet({ exam, examCode, domains, topics, addable, tutorOn }: {
  exam: string;
  examCode: string;
  domains: { id: string; name: string }[];
  topics: TopicView[];
  /** Exam topics that aren't on the sheet yet. */
  addable: { topic: string; domainName: string }[];
  tutorOn: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<Record<string, string>>({});
  const [showHidden, setShowHidden] = useState(false);
  const [panel, setPanel] = useState<"none" | "add" | "tutor">("none");

  const visible = topics.filter((t) => !t.hidden);
  const hidden = topics.filter((t) => t.hidden);
  // Pinned topics first, then the weakest practised ones, up to three.
  const weakest = visible.filter((t) => t.practised && !t.pinned && (t.missed > 0 || (t.accuracy ?? 1) < 0.8))
    .sort((a, b) => b.missed - a.missed || (a.accuracy ?? 1) - (b.accuracy ?? 1));
  const focus = [...visible.filter((t) => t.pinned), ...weakest].slice(0, 3);
  const destinations = visible.map((t) => ({ value: t.sectionId ? `s:${t.sectionId}` : `t:${t.topic}`, label: t.name }));

  const openTopic = (key: string, toTab?: string) => {
    setOpen(key);
    if (toTab) setTab((m) => ({ ...m, [key]: toTab }));
    requestAnimationFrame(() => document.getElementById(`topic-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const rowProps = { exam, open, tab, setTab, setOpen, destinations, tutorOn, examCode };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button className={panel === "add" ? "btn-primary" : "btn-ghost"} onClick={() => setPanel(panel === "add" ? "none" : "add")}>+ Add topic</button>
        {tutorOn && <button className={panel === "tutor" ? "btn-primary" : "btn-ghost"} onClick={() => setPanel(panel === "tutor" ? "none" : "tutor")}>✨ Ask tutor</button>}
        <Link className="btn-ghost" href={`/study/${exam}/cheatsheet`}>Cheat sheet</Link>
      </div>

      {panel === "add" && <AddTopic exam={exam} addable={addable} onDone={(key) => { setPanel("none"); if (key) openTopic(key); }} />}
      {panel === "tutor" && (
        <div className="card mt-3 p-5">
          <div className="flex items-center justify-between"><p className="font-extrabold">✨ Ask the tutor about anything in {examCode}</p><button className="text-xs font-bold text-soft" onClick={() => setPanel("none")}>Close</button></div>
          <div className="mt-2">
            <ChatThread access="ok" saveTarget={{ exam, destinations }}
              suggestions={["Quiz me on my weak topics", exam === "aif-c01" ? "Compare Bedrock, SageMaker and Amazon Q" : "Compare RDS, Aurora and DynamoDB", "Draw how a VPC connects to the internet"]}
              placeholder="Ask anything, or ask for a table or diagram…"
              send={(turns, onText) => streamPost("/api/ai/study-chat", { exam, turns }, onText)} />
          </div>
        </div>
      )}

      {focus.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow">Study these next</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {focus.map((t) => {
              const tn = tone(t);
              return (
                <button key={t.key} onClick={() => openTopic(t.key)}
                  className={`card p-4 text-left transition hover:border-brand ${t.missed ? "!border-bad/50" : "!border-warn/50"}`}>
                  <span className="flex items-center gap-2 font-extrabold">{t.pinned && <span aria-label="Pinned">📌</span>}{t.name}</span>
                  <span className="mt-1 block text-xs text-muted">{[tn.label, notesLabel(t.items.length)].filter(Boolean).join(" · ")}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {domains.map((d) => {
        const list = visible.filter((t) => t.domain === d.id && !t.sectionId);
        if (!list.length) return null;
        return (
          <section key={d.id} className="mt-8">
            <h2 className="eyebrow">{d.name}</h2>
            <div className="card mt-2 divide-y divide-line px-1">{list.map((t) => <TopicRow key={t.key} t={t} {...rowProps} />)}</div>
          </section>
        );
      })}

      {visible.some((t) => t.sectionId) && (
        <section className="mt-8">
          <h2 className="eyebrow">Your topics</h2>
          <div className="card mt-2 divide-y divide-line px-1">{visible.filter((t) => t.sectionId).map((t) => <TopicRow key={t.key} t={t} {...rowProps} />)}</div>
        </section>
      )}

      {hidden.length > 0 && (
        <section className="mt-8">
          <button className="text-sm font-bold text-soft hover:text-brand" onClick={() => setShowHidden(!showHidden)}>
            {showHidden ? "▾" : "▸"} Hidden topics ({hidden.length})
          </button>
          {showHidden && <div className="card mt-2 divide-y divide-line px-1">{hidden.map((t) => <TopicRow key={t.key} t={t} {...rowProps} />)}</div>}
        </section>
      )}
    </div>
  );
}

function TopicRow({ t, exam, examCode, open, setOpen, tab, setTab, destinations, tutorOn }: {
  t: TopicView; exam: string; examCode: string; open: string | null; setOpen: (k: string | null) => void;
  tab: Record<string, string>; setTab: (fn: (m: Record<string, string>) => Record<string, string>) => void;
  destinations: { value: string; label: string }[]; tutorOn: boolean;
}) {
  const isOpen = open === t.key;
  const own = !!t.sectionId;
  const tabs = [
    ...(own ? [] : [["summary", "Summary"]]),
    ["notes", `My notes${t.items.length ? ` · ${t.items.length}` : ""}`],
    ...(own ? [] : [["mistakes", `Mistakes${t.mistakes.length ? ` · ${t.mistakes.length}` : ""}`]]),
    ...(tutorOn ? [["tutor", "✨ Ask tutor"]] : []),
  ];
  const current = tab[t.key] ?? tabs[0][0];
  const tn = tone(t);

  return (
    <div id={`topic-${t.key}`} className="scroll-mt-4">
      <button className="flex w-full items-center gap-3 px-3 py-3 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.key)}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tn.dot}`} aria-hidden />
        <span className="min-w-0 flex-1 truncate font-semibold">{t.pinned && <span className="mr-1" aria-label="Pinned">📌</span>}{t.name}</span>
        <span className="hidden text-xs text-muted sm:inline">{[tn.label, notesLabel(t.items.length)].filter(Boolean).join(" · ")}</span>
        <span className="text-muted" aria-hidden>{isOpen ? "▴" : "▾"}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-4">
          <div className="flex flex-wrap gap-1" role="tablist">
            {tabs.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={current === k} onClick={() => setTab((m) => ({ ...m, [t.key]: k }))}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${current === k ? "bg-brand-soft text-brand" : "text-soft hover:bg-surface-2"}`}>{label}</button>
            ))}
          </div>
          <div className="mt-3">
            {current === "summary" && <Summary t={t} exam={exam} />}
            {current === "notes" && <Notes t={t} exam={exam} destinations={destinations} />}
            {current === "mistakes" && <Mistakes t={t} exam={exam} />}
            {current === "tutor" && (
              <ChatThread key={t.key} access="ok" saveTarget={{ exam, target: targetOf(t) }} saveLabel="Add to my notes"
                suggestions={[`Explain ${t.name} simply`, `Quiz me on ${t.name}`, "Show it as a table or diagram"]}
                placeholder={`Ask about ${t.name}…`}
                emptyHint={<p className="text-sm text-soft">Ask anything about {t.name} for {examCode}. Useful answers can go straight into My notes.</p>}
                send={(turns, onText) => streamPost("/api/ai/study-chat", { exam, topic: t.name, turns }, onText)} />
            )}
          </div>
          <TopicActions t={t} exam={exam} />
        </div>
      )}
    </div>
  );
}

function Summary({ t, exam }: { t: TopicView; exam: string }) {
  const [more, setMore] = useState(false);
  if (!t.card) return t.topic ? <CardLoader exam={exam} topic={t.topic} /> : null;
  if (more) return <div><ConceptCardBody card={t.card} /><button className="mt-2 text-xs font-bold text-brand" onClick={() => setMore(false)}>Show less</button></div>;
  return (
    <div className="text-sm">
      <p className="rounded-lg bg-brand-soft px-3 py-2 font-semibold text-brand">Remember: {t.card.remember}</p>
      <p className="mt-2 text-soft">{t.card.oneLiner}</p>
      <button className="mt-2 text-xs font-bold text-brand" onClick={() => setMore(true)}>Show key points and traps ›</button>
    </div>
  );
}

function Mistakes({ t, exam }: { t: TopicView; exam: string }) {
  if (!t.mistakes.length) {
    return <p className="text-sm text-soft">{t.practised ? "No open mistakes in this topic. 🎉" : <>Not practised yet. <Link className="font-bold text-brand" href={`/practice/${exam}`}>Practise questions</Link></>}</p>;
  }
  return (
    <ul className="space-y-3 text-sm">
      {t.mistakes.map((m) => (
        <li key={m.questionId} className="rounded-xl border border-line p-3">
          <p className="text-soft">{m.prompt}</p>
          <p className="mt-1">You chose <b className="text-bad">{m.picked.join(" + ")}</b>; the answer was <b className="text-ok">{m.correct.join(" + ")}</b>.</p>
        </li>
      ))}
    </ul>
  );
}

function Notes({ t, exam, destinations }: { t: TopicView; exam: string; destinations: { value: string; label: string }[] }) {
  return (
    <div className="space-y-2.5">
      {t.items.length === 0 && (
        <p className="text-sm text-soft">Nothing saved yet. Use <b>📌 Save to study sheet</b> on the tutor in any practice question, ask the tutor here, or write your own note.</p>
      )}
      {t.items.map((i) => <ItemCard key={i.id} item={i} destinations={destinations} current={t.sectionId ? `s:${t.sectionId}` : `t:${t.topic}`} />)}
      <AddNote exam={exam} target={targetOf(t)} />
    </div>
  );
}

function ItemCard({ item, destinations, current }: { item: SheetItem; destinations: { value: string; label: string }[]; current: string }) {
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
        <span className={`font-bold ${isNote ? "text-warn" : "text-brand"}`}>{isNote ? "📝 My note" : "📌 Saved"}</span>
        <span className="flex-1" />
        <select aria-label="Move to another topic" className="max-w-40 rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs text-soft" value={current} disabled={pending}
          onChange={(e) => { const v = e.target.value; run(() => moveItemAction(item.id, v.startsWith("s:") ? { sectionId: Number(v.slice(2)) } : { topic: v.slice(2) })); }}>
          {destinations.map((d) => <option key={d.value} value={d.value}>{d.value === current ? "Move to…" : d.label}</option>)}
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
      {!isNote && <p className="mt-2 text-[11px] text-muted">{item.sourceQuestion ? `From practice question ${item.sourceQuestion}` : "From the study tutor"} · {item.savedOn}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-bad">{error}</p>}
    </div>
  );
}

function AddNote({ exam, target }: { exam: string; target: Target }) {
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

function TopicActions({ t, exam }: { t: TopicView; exam: string }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(t.name);
  const { pending, error, run } = useAction();
  const link = "font-bold text-soft hover:text-brand";
  let body: ReactNode;
  if (t.sectionId) {
    const id = t.sectionId;
    body = renaming ? (
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); run(() => renameSectionAction(id, name), () => setRenaming(false)); }}>
        <input className="input !w-56 !py-1 text-sm" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus aria-label="Topic name" />
        <button className="btn-primary !px-3 !py-1 !text-xs" disabled={pending}>Save</button>
      </form>
    ) : (
      <>
        <button className={link} onClick={() => setRenaming(true)}>Rename</button>
        <button className="font-bold text-soft hover:text-bad" disabled={pending}
          onClick={() => { if (confirm(`Delete "${t.name}" and its notes?`)) run(() => deleteSectionAction(id)); }}>Delete topic</button>
      </>
    );
  } else {
    const topic = t.topic!;
    body = (
      <>
        <button className={link} disabled={pending} onClick={() => run(() => setTopicPrefAction(exam, topic, { pinned: !t.pinned }))}>{t.pinned ? "Unpin" : "📌 Pin to Study these next"}</button>
        <button className={link} disabled={pending} onClick={() => run(() => setTopicPrefAction(exam, topic, { hidden: !t.hidden }))}>{t.hidden ? "Show topic again" : "Hide topic"}</button>
      </>
    );
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-xs">
      {body}
      {error && <span className="font-semibold text-bad">{error}</span>}
    </div>
  );
}

function AddTopic({ exam, addable, onDone }: { exam: string; addable: { topic: string; domainName: string }[]; onDone: (key?: string) => void }) {
  const [pick, setPick] = useState("");
  const [name, setName] = useState("");
  const { pending, error, run } = useAction();
  return (
    <div className="card mt-3 grid gap-5 p-5 md:grid-cols-2">
      <form onSubmit={(e) => { e.preventDefault(); if (pick) run(() => setTopicPrefAction(exam, pick, { added: true, hidden: false }), () => onDone(`t:${pick}`)); }}>
        <p className="font-extrabold">Add an exam topic</p>
        <p className="text-xs text-muted">Start studying a topic before you&apos;ve practised it.</p>
        <div className="mt-2 flex gap-2">
          <select className="input !py-1.5 text-sm" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Exam topic">
            <option value="">Choose a topic…</option>
            {addable.map((a) => <option key={a.topic} value={a.topic}>{a.topic} · {a.domainName}</option>)}
          </select>
          <button className="btn-primary !py-1.5" disabled={pending || !pick}>Add</button>
        </div>
      </form>
      <form onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await createSectionAction(exam, name); if (r.ok) onDone(`s:${r.id}`); return r; }); }}>
        <p className="font-extrabold">Create your own topic</p>
        <p className="text-xs text-muted">For anything you want to collect, like &ldquo;Databases compared&rdquo;.</p>
        <div className="mt-2 flex gap-2">
          <input className="input !py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Databases compared" aria-label="Topic name" />
          <button className="btn-primary !py-1.5" disabled={pending || !name.trim()}>Create</button>
        </div>
      </form>
      {error && <p className="text-sm font-semibold text-bad md:col-span-2">{error}</p>}
      <button className="justify-self-start text-xs font-bold text-soft md:col-span-2" onClick={() => onDone()}>Close</button>
    </div>
  );
}
