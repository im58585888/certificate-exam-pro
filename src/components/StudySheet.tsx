"use client";

import Link from "next/link";
import { Fragment, useState, useTransition, type ReactNode } from "react";
import {
  addNoteAction, createSectionAction, deleteSectionAction, editNoteAction, moveItemAction, removeItemAction,
  renameSectionAction, retryMistakesAction, setTopicPrefAction, type NotebookResult,
} from "@/app/study/actions";
import type { ConceptCard } from "@/lib/ai";
import { CardLoader } from "./CardLoader";
import { ChatMarkdown } from "./ChatMarkdown";
import { Mia, MiaPose } from "./Mia";
import { ConceptCardBody } from "./StudyCards";
import { ChatThread, streamPost } from "./Tutor";

// The study sheet (pass holders): a domain scoreboard and filter chips over a grid of topic tiles (opening on the topics
// to fix), with one topic's detail open at a time, and the AI tutor docked on the right, focused on the open topic.

export interface SheetItem {
  id: number;
  kind: "clip" | "note";
  title: string | null;
  body: string;
  sourceQuestion: string | null;
  savedOn: string;
}

export interface SheetMistake {
  questionId: string;
  stem: string;
  prompt: string;
  multi: boolean;
  options: { text: string; correct: boolean; picked: boolean; why: string }[];
  answer: string;
}

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

type Status = "fix" | "shaky" | "solid" | "new" | "own";

function statusOf(t: TopicView): Status {
  if (t.sectionId) return "own";
  if (!t.practised) return "new";
  if (t.missed) return "fix";
  return (t.accuracy ?? 1) < 0.8 ? "shaky" : "solid";
}

const STATUS: Record<Status, { edge: string; label: (t: TopicView) => string }> = {
  fix: { edge: "border-l-bad", label: (t) => `${t.missed} to fix` },
  shaky: { edge: "border-l-warn", label: (t) => `${Math.round((t.accuracy ?? 0) * 100)}% right` },
  solid: { edge: "border-l-ok", label: () => "Solid" },
  new: { edge: "border-l-line", label: () => "Not started" },
  own: { edge: "border-l-brand", label: () => "Your topic" },
};

const FILTERS: [string, string][] = [["fix", "To fix"], ["shaky", "Shaky"], ["solid", "Solid"], ["new", "Not started"], ["own", "Your topics"], ["notes", "With notes"], ["pinned", "Pinned"], ["all", "All"]];

const notesLabel = (n: number) => (n ? `${n} note${n === 1 ? "" : "s"}` : "");

export function StudySheet({ exam, examCode, domains, topics, addable, tutorOn }: {
  exam: string;
  examCode: string;
  domains: { id: string; name: string; short: string }[];
  topics: TopicView[];
  /** Exam topics that aren't on the sheet yet. */
  addable: { topic: string; domainName: string }[];
  tutorOn: boolean;
}) {
  const visible = topics.filter((t) => !t.hidden);
  const hidden = topics.filter((t) => t.hidden);
  const matches = (t: TopicView, f: string) =>
    f === "all" ? true : f === "notes" ? t.items.length > 0 : f === "pinned" ? t.pinned : statusOf(t) === f;
  const counts = Object.fromEntries(FILTERS.map(([f]) => [f, visible.filter((t) => matches(t, f)).length]));

  const [filter, setFilter] = useState(counts.fix ? "fix" : "all");
  const [domain, setDomain] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // A–Z by default; "Weakest first" keeps the order the server sends (topics with mistakes, then lowest accuracy).
  const [sort, setSort] = useState<"az" | "weak">("az");
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<Record<string, string>>({});
  const [showHidden, setShowHidden] = useState(false);
  const [adding, setAdding] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false); // phones only; the tutor is always shown on wide screens

  const destinations = visible.map((t) => ({ value: t.sectionId ? `s:${t.sectionId}` : `t:${t.topic}`, label: t.name }));
  const focus = topics.find((t) => t.key === open) ?? null;
  const q = search.trim().toLowerCase();
  const shown = visible
    .filter((t) => matches(t, filter) && (!domain || t.domain === domain) && (!q || t.name.toLowerCase().includes(q) || (t.topic ?? "").toLowerCase().includes(q)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sort === "az" ? a.name.localeCompare(b.name) : topics.indexOf(a) - topics.indexOf(b)));

  const openTopic = (key: string) => {
    setOpen(open === key ? null : key);
    requestAnimationFrame(() => document.getElementById(`topic-${key}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };
  const tiles = (list: TopicView[]) => (
    // Dense packing lets the tiles after an open one fill its row, so the detail card sits right under that row.
    <div className="grid grid-flow-row-dense grid-cols-2 gap-2.5 sm:grid-cols-3">
      {list.map((t) => (
        <Fragment key={t.key}>
          <Tile t={t} active={open === t.key} onClick={() => openTopic(t.key)} />
          {open === t.key && (
            <div className="col-span-full">
              <TopicDetail t={t} exam={exam} tab={tab[t.key]} setTab={(k) => setTab((m) => ({ ...m, [t.key]: k }))} destinations={destinations}
                onAsk={tutorOn ? () => setTutorOpen(true) : undefined} />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button className={adding ? "btn-primary" : "btn-ghost"} onClick={() => setAdding(!adding)}>+ Add topic</button>
          <Link className="btn-ghost" href={`/study/${exam}/cheatsheet`}>Cheat sheet</Link>
        </div>
        {adding && <AddTopic exam={exam} addable={addable} onDone={(key) => { setAdding(false); if (key) { setFilter("all"); setDomain(null); setOpen(key); } }} />}

        <DomainScoreboard domains={domains} topics={visible} active={domain} onPick={(d) => setDomain(domain === d ? null : d)} />

        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          {FILTERS.filter(([f]) => f === "all" || counts[f] > 0).map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${filter === f ? "border-brand bg-brand-soft text-brand" : "border-line text-soft hover:border-brand"}`}>
              {label} · {counts[f]}
            </button>
          ))}
          <select value={sort} onChange={(e) => setSort(e.target.value as "az" | "weak")} aria-label="Sort topics"
            className="ml-auto rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold text-soft">
            <option value="az">Sort: A–Z</option>
            <option value="weak">Sort: Weakest first</option>
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search topics" aria-label="Search topics"
            className="w-40 rounded-full border border-line bg-surface px-3 py-1 text-xs" />
        </div>
        {domain && (
          <p className="mt-2 text-xs text-muted">Showing {domains.find((d) => d.id === domain)?.name}. <button className="font-bold text-brand" onClick={() => setDomain(null)}>Show all domains</button></p>
        )}

        {shown.length === 0 && (
          <p className="card mt-4 p-5 text-sm text-soft">
            {filter === "fix" ? "Nothing to fix here. 🎉 " : "No topics match. "}
            <button className="font-bold text-brand" onClick={() => { setFilter("all"); setDomain(null); setSearch(""); }}>Show all topics</button>
          </p>
        )}
        {domains.map((d) => {
          const list = shown.filter((t) => t.domain === d.id && !t.sectionId);
          return list.length ? (
            <section key={d.id} className="mt-6">
              <h2 className="eyebrow mb-2">{d.name}</h2>
              {tiles(list)}
            </section>
          ) : null;
        })}
        {shown.some((t) => t.sectionId) && (
          <section className="mt-6">
            <h2 className="eyebrow mb-2">Your topics</h2>
            {tiles(shown.filter((t) => t.sectionId))}
          </section>
        )}

        {hidden.length > 0 && (
          <section className="mt-8">
            <button className="text-sm font-bold text-soft hover:text-brand" onClick={() => setShowHidden(!showHidden)}>
              {showHidden ? "▾" : "▸"} Hidden topics ({hidden.length})
            </button>
            {showHidden && <div className="mt-2">{tiles(hidden)}</div>}
          </section>
        )}
      </div>

      {tutorOn && <TutorPanel exam={exam} examCode={examCode} focus={focus} destinations={destinations} open={tutorOpen} setOpen={setTutorOpen} onClearFocus={() => setOpen(null)} />}
    </div>
  );
}

function Tile({ t, active, onClick }: { t: TopicView; active: boolean; onClick: () => void }) {
  const st = statusOf(t);
  return (
    <button id={`topic-${t.key}`} onClick={onClick} aria-expanded={active}
      className={`scroll-mt-4 rounded-r-xl border border-l-4 border-line bg-surface px-3 py-2.5 text-left transition hover:border-brand ${STATUS[st].edge} ${active ? "!border-brand bg-brand-soft" : ""}`}>
      <span className="flex items-start gap-1 text-sm font-bold leading-snug">{t.pinned && <span aria-label="Pinned">📌</span>}<span className="line-clamp-2">{t.name}</span></span>
      <span className="mt-0.5 block text-[11px] text-muted">{[STATUS[st].label(t), notesLabel(t.items.length)].filter(Boolean).join(" · ")}</span>
    </button>
  );
}

/** One card per exam domain: % correct on the latest answers, and how its topics split between to fix, shaky and solid. */
function DomainScoreboard({ domains, topics, active, onPick }: { domains: { id: string; name: string; short: string }[]; topics: TopicView[]; active: string | null; onPick: (d: string) => void }) {
  const cards = domains.map((d) => {
    const list = topics.filter((t) => t.domain === d.id);
    const seen = list.reduce((s, t) => s + t.seen, 0);
    const right = list.reduce((s, t) => s + t.seen - t.missed, 0);
    const n = (s: Status) => list.filter((t) => statusOf(t) === s).length;
    return { ...d, pct: seen ? Math.round((right / seen) * 100) : null, fix: n("fix"), shaky: n("shaky"), solid: n("solid"), fresh: n("new"), total: list.length };
  });
  return (
    <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {cards.map((c) => (
        <button key={c.id} onClick={() => onPick(c.id)} aria-pressed={active === c.id} title={c.name}
          className={`card p-3 text-left transition hover:border-brand ${active === c.id ? "!border-brand" : ""}`}>
          <span className="block truncate text-xs text-muted">{c.short}</span>
          <span className="mt-0.5 block text-xl font-extrabold tabular-nums">{c.pct === null ? "–" : `${c.pct}%`}</span>
          <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
            {c.total > 0 && <>
              <span className="bg-ok" style={{ width: `${(c.solid / c.total) * 100}%` }} />
              <span className="bg-warn" style={{ width: `${(c.shaky / c.total) * 100}%` }} />
              <span className="bg-bad" style={{ width: `${(c.fix / c.total) * 100}%` }} />
            </>}
          </span>
          <span className="mt-1 block text-[11px] text-muted">{c.total ? `${c.fix} to fix · ${c.solid} solid` : "Not started"}</span>
        </button>
      ))}
    </div>
  );
}

function TopicDetail({ t, exam, tab, setTab, destinations, onAsk }: {
  t: TopicView; exam: string; tab?: string; setTab: (k: string) => void; destinations: { value: string; label: string }[]; onAsk?: () => void;
}) {
  const own = !!t.sectionId;
  const tabs = [
    ...(own ? [] : [["summary", "Summary"]]),
    ["notes", `My notes${t.items.length ? ` · ${t.items.length}` : ""}`],
    ...(own ? [] : [["mistakes", `Mistakes${t.mistakes.length ? ` · ${t.mistakes.length}` : ""}`]]),
  ];
  const current = tab ?? tabs[0][0];
  return (
    <div className="rounded-2xl border-[1.5px] border-brand/40 bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-extrabold">{t.name}</h3>
        {onAsk && <button className="text-xs font-bold text-brand lg:hidden" onClick={onAsk}>Ask Mia about this</button>}
        <span className="hidden text-xs text-muted lg:inline">Mia, on the right, is now focused on this topic</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={current === k} onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${current === k ? "bg-brand-soft text-brand" : "text-soft hover:bg-surface-2"}`}>{label}</button>
        ))}
      </div>
      <div className="mt-3">
        {current === "summary" && <Summary t={t} exam={exam} />}
        {current === "notes" && <Notes t={t} exam={exam} destinations={destinations} />}
        {current === "mistakes" && <Mistakes t={t} exam={exam} />}
      </div>
      <TopicActions t={t} exam={exam} />
    </div>
  );
}

/** The study tutor: docked on the right and kept in view on wide screens, a bottom sheet behind a button on phones. */
function TutorPanel({ exam, examCode, focus, destinations, open, setOpen, onClearFocus }: {
  exam: string; examCode: string; focus: TopicView | null; destinations: { value: string; label: string }[];
  open: boolean; setOpen: (v: boolean) => void; onClearFocus: () => void;
}) {
  const suggestions = focus
    ? [`Explain ${focus.name} simply`, `Quiz me on ${focus.name}`, "Show it as a table or diagram"]
    : ["Quiz me on my weak topics", exam === "aif-c01" ? "Compare Bedrock, SageMaker and Amazon Q" : "Compare RDS, Aurora and DynamoDB", "Draw how a VPC connects to the internet"];
  return (
    <>
      {!open && <button className="btn-primary fixed right-4 bottom-4 z-40 shadow-lg lg:hidden" onClick={() => setOpen(true)}><Mia size={22} /> Ask Mia</button>}
      <aside aria-label="AI tutor"
        className={`${open ? "flex" : "hidden"} fixed inset-x-0 bottom-0 z-50 max-h-[80vh] flex-col overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-5 shadow-2xl
          lg:sticky lg:top-4 lg:z-auto lg:flex lg:max-h-[calc(100vh-2rem)] lg:self-start lg:rounded-2xl lg:border lg:shadow-none`}>
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2.5 font-extrabold"><Mia size={32} /><span>Mia<span className="block text-xs font-semibold text-muted">AI tutor</span></span></p>
          <button className="text-xs font-bold text-soft lg:hidden" onClick={() => setOpen(false)}>Close</button>
        </div>
        <p className="mt-1 text-xs text-muted">
          {focus ? <>Focused on <b className="text-ink">{focus.name}</b> · <button className="font-bold text-brand" onClick={onClearFocus}>Any topic</button></> : <>Ask about anything in {examCode}, or open a topic to focus on it.</>}
        </p>
        <div className="mt-2">
          <ChatThread access="ok" suggestions={suggestions}
            emptyHint={
              <div className="mt-2 flex items-end gap-2">
                <MiaPose pose="welcoming" height={104} className="-ml-2" />
                <p className="mb-3 rounded-2xl rounded-bl-sm bg-brand-soft px-3 py-2 text-sm text-ink">
                  {focus ? <>Let&apos;s work on <b>{focus.name}</b>. Ask me anything, or tap a suggestion.</> : <>Hi! Open a topic and I&apos;ll focus on it, or ask me anything.</>}
                </p>
              </div>
            }
            saveTarget={focus ? { exam, target: targetOf(focus) } : { exam, destinations }}
            saveLabel={focus ? `Add to ${focus.name.length > 24 ? "this topic" : focus.name} notes` : "Save to study sheet"}
            placeholder={focus ? `Ask about ${focus.name}…` : "Ask anything, or ask for a table or diagram…"}
            send={(turns, onText) => streamPost("/api/ai/study-chat", { exam, topic: focus?.name, turns }, onText)} />
        </div>
      </aside>
    </>
  );
}

function Summary({ t, exam }: { t: TopicView; exam: string }) {
  if (!t.card) return t.topic ? <CardLoader exam={exam} topic={t.topic} /> : null;
  return <ConceptCardBody card={t.card} />;
}

function Mistakes({ t, exam }: { t: TopicView; exam: string }) {
  if (!t.mistakes.length) {
    return <p className="text-sm text-soft">{t.practised ? "No open mistakes in this topic. 🎉" : <>Not practised yet. <Link className="font-bold text-brand" href={`/practice/${exam}`}>Practise questions</Link></>}</p>;
  }
  return (
    <div className="space-y-3">
      {t.mistakes.length > 1 && (
        <form action={retryMistakesAction} className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted">{t.mistakes.length} questions you last got wrong in this topic.</p>
          <input type="hidden" name="exam" value={exam} />
          {t.mistakes.map((m) => <input key={m.questionId} type="hidden" name="id" value={m.questionId} />)}
          <button className="btn-ghost !py-1 text-xs">Practise all {t.mistakes.length} again</button>
        </form>
      )}
      {t.mistakes.map((m, n) => <MistakeCard key={m.questionId} m={m} n={n + 1} total={t.mistakes.length} exam={exam} />)}
    </div>
  );
}

/** One missed question in full: the scenario, every option marked, why the learner's pick was wrong and the answer right. */
function MistakeCard({ m, n, total, exam }: { m: SheetMistake; n: number; total: number; exam: string }) {
  const [open, setOpen] = useState(n === 1);
  const yours = m.options.filter((o) => o.picked && !o.correct);
  const right = m.options.filter((o) => o.correct);
  return (
    <article className="rounded-xl border border-line p-3.5 text-sm">
      <button className="flex w-full items-start gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="mt-0.5 text-xs text-muted">{open ? "▾" : "▸"}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold tracking-wide text-muted uppercase">Mistake {n} of {total}</span>
          <span className={`block leading-relaxed text-ink ${open ? "" : "line-clamp-2"}`}>{m.stem}</span>
        </span>
      </button>
      {open && (
        <div className="mt-2 pl-5">
          <p className="font-semibold leading-relaxed text-ink">{m.prompt}{m.multi ? ` (Choose ${right.length}.)` : ""}</p>
          <ul className="mt-2 space-y-1.5">
            {m.options.map((o) => (
              <li key={o.text}
                className={`rounded-lg border px-3 py-1.5 ${o.correct ? "border-ok/50 bg-ok-soft font-semibold text-ok" : o.picked ? "border-bad/50 bg-bad-soft font-semibold text-bad" : "border-line text-soft"}`}>
                <span aria-hidden className="mr-1.5">{o.correct ? "✓" : o.picked ? "✗" : "·"}</span>
                {o.text}
                {o.picked && <span className="ml-1.5 text-xs font-normal">(your answer)</span>}
                {o.correct && !o.picked && <span className="ml-1.5 text-xs font-normal">(correct answer)</span>}
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1.5 leading-relaxed">
            {yours.map((o) => <p key={o.text}><span className="font-bold text-bad">Why yours was wrong:</span> <span className="text-soft">{o.why}</span></p>)}
            {right.map((o) => <p key={o.text}><span className="font-bold text-ok">Why the answer is right:</span> <span className="text-soft">{o.why}</span></p>)}
            {m.answer && <p className="text-soft">{m.answer}</p>}
          </div>
          <form action={retryMistakesAction} className="mt-3">
            <input type="hidden" name="exam" value={exam} /><input type="hidden" name="id" value={m.questionId} />
            <button className="btn-ghost !py-1 text-xs">Practise this question again</button>
          </form>
        </div>
      )}
    </article>
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
        <span className={`font-bold ${isNote ? "text-warn" : "text-brand"}`}>{isNote ? "📝 My note" : <span className="inline-flex items-center gap-1.5"><Mia size={16} />Saved from Mia</span>}</span>
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
      {!isNote && <p className="mt-2 text-[11px] text-muted">{item.sourceQuestion ? `From practice question ${item.sourceQuestion}` : "From the study sheet"} · {item.savedOn}</p>}
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
