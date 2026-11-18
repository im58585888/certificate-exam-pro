"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { Breakdown } from "@/lib/ai";
import { ChatMarkdown } from "./ChatMarkdown";
import { Mia, MiaPose, MiaThinking } from "./Mia";
import { cluesMarkdown, optionsMarkdown, pictureMarkdown, SaveToSheet, tableMarkdown, termsMarkdown } from "./SaveToSheet";
import type { SheetAccess } from "@/lib/sheetAccess";

// ---------- Small helpers ----------

/** Renders the tutor's light markdown: "## " headings, "- " bullets, **bold** and paragraphs. */
export function MiniMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push(<p key={blocks.length} className="leading-relaxed">{inline(para.join(" "))}</p>);
    if (bullets.length) blocks.push(<ul key={blocks.length} className="list-disc space-y-1 pl-5 leading-relaxed">{bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}</ul>);
    para = []; bullets = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("#")) { flush(); blocks.push(<h4 key={blocks.length} className="pt-1 font-extrabold text-ink">{inline(line.replace(/^#+\s*/, ""))}</h4>); continue; }
    if (/^[-*•]\s/.test(line)) { if (para.length) { const p = para; para = []; blocks.push(<p key={blocks.length} className="leading-relaxed">{inline(p.join(" "))}</p>); } bullets.push(line.slice(2)); continue; }
    if (bullets.length) flush();
    para.push(line);
  }
  flush();
  return <div className="space-y-2.5 text-[0.95rem]">{blocks}</div>;
}

function inline(s: string): ReactNode {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <b key={i} className="text-ink">{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>);
}

async function readError(res: Response): Promise<string> {
  const j = await res.json().catch(() => null);
  return j?.error ?? "The tutor couldn't respond. Please try again.";
}

/** POSTs and streams the text response, calling onText with everything received so far. */
export async function streamPost(url: string, body: unknown, onText: (text: string) => void): Promise<string> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) throw new Error(await readError(res));
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    onText(text);
  }
  return text;
}

function Section({ n, title, action, children }: { n: number; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-base font-extrabold">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs text-on-brand">{n}</span>{title}
        </h3>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function TableView({ t }: { t: NonNullable<Breakdown["table"]> }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-sm">
        <caption className="px-3 pt-2.5 text-left text-xs font-bold text-muted">{t.caption}</caption>
        <thead><tr>{t.columns.map((c) => <th key={c} className="border-b border-line px-3 py-2 font-bold">{c}</th>)}</tr></thead>
        <tbody>{t.rows.map((r, i) => <tr key={i} className="border-b border-line last:border-0">{r.map((c, j) => <td key={j} className="px-3 py-2 align-top text-soft">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// ---------- Breakdown ----------

function BreakdownView({ b, save, narrow }: { b: Breakdown; save: (title: string, body: string) => ReactNode; narrow?: boolean }) {
  const two = narrow ? "" : "sm:grid-cols-2";
  let n = 0;
  return (
    <div>
      <h2 className="text-xl font-extrabold">{b.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-soft">
        Tests your understanding of {b.testing.map((t) => <span key={t} className="pill bg-surface-2 text-soft">{t}</span>)}
      </div>

      <Section n={++n} title="What is the question really asking?">
        <ol className={`grid gap-2 ${two}`}>
          {b.requirements.map((r, i) => (
            <li key={i} className="rounded-xl border border-line bg-bg p-3">
              <b className="text-ink">{i + 1}. {r.label}</b>
              <span className="mt-0.5 block text-sm text-soft">{r.detail}</span>
            </li>
          ))}
        </ol>
      </Section>

      {b.picture && b.picture.steps.length > 0 && (
        <Section n={++n} title="Picture the scenario" action={save(`${b.title}: picture`, pictureMarkdown(b.picture))}>
          <div className="flex flex-wrap items-stretch gap-2">
            {b.picture.steps.map((s, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="self-center text-xl font-bold text-brand" aria-hidden>→</span>}
                <div className="min-w-[8rem] flex-1 rounded-xl border-[1.5px] border-brand bg-brand-soft px-3 py-2 text-center">
                  <b className="block text-sm text-ink">{s.label}</b>
                  <span className="text-xs text-soft">{s.note}</span>
                </div>
              </Fragment>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">{b.picture.caption}</p>
        </Section>
      )}

      {b.clues.length > 0 && (
        <Section n={++n} title="Key phrases to notice" action={save(`${b.title}: key phrases`, cluesMarkdown(b.clues))}>
          <ul className="space-y-2">
            {b.clues.map((c, i) => (
              <li key={i} className="rounded-xl bg-warn-soft px-3 py-2 text-sm">
                <b className="text-warn">&ldquo;{c.phrase}&rdquo;</b> <span className="text-ink">{c.meaning}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {b.terms.length > 0 && (
        <Section n={++n} title="Terms you need" action={save(`${b.title}: terms`, termsMarkdown(b.terms))}>
          <dl className={`grid gap-2 ${two}`}>
            {b.terms.map((t) => (
              <div key={t.term} className="rounded-xl border border-line bg-bg p-3 text-sm">
                <dt className="font-extrabold text-ink">{t.term}</dt>
                <dd className="mt-0.5 text-soft">{t.plain}</dd>
                {t.example && <dd className="mt-1 text-xs text-muted">Example: {t.example}</dd>}
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Section n={++n} title="The technologies in the options" action={save(`${b.title}: the technologies`, optionsMarkdown(b.options))}>
        <div className={`grid gap-2.5 ${two}`}>
          {b.options.map((o) => (
            <div key={o.name} className="rounded-xl border border-line bg-bg p-3.5 text-sm">
              <b className="block text-base text-ink">{o.name}</b>
              <p className="mt-1 text-soft">{o.what}</p>
              <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-soft"><b className="text-ink">Think of it as:</b> {o.analogy}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-soft">{o.keyFacts.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          ))}
        </div>
      </Section>

      {b.table && b.table.rows.length > 0 && (
        <div className="mt-5">
          <TableView t={b.table} />
          <div className="mt-1.5 text-right">{save(b.table.caption, tableMarkdown(b.table))}</div>
        </div>
      )}

      <div className="mt-6 rounded-xl border-[1.5px] border-dashed border-brand px-4 py-3">
        <b className="text-brand">Your move:</b> {b.yourMove}
      </div>
    </div>
  );
}

// ---------- Follow-up chat ----------

export type Turn = { role: "user" | "assistant"; content: string };

/**
 * The message box: starts at three lines and grows with what's typed (up to about ten lines, then scrolls).
 * Enter sends; Shift+Enter adds a new line.
 */
export function Composer({ value, onChange, onSend, busy, placeholder, className = "" }: {
  value: string; onChange: (v: string) => void; onSend: () => void; busy: boolean; placeholder: string; className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);
  return (
    <form className={`flex items-end gap-2 ${className}`} onSubmit={(e) => { e.preventDefault(); onSend(); }}>
      <textarea ref={ref} rows={3} maxLength={1500} value={value} placeholder={placeholder} aria-label="Message Mia"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy && value.trim()) onSend(); } }}
        className="max-h-60 min-h-[4.5rem] min-w-0 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-relaxed" />
      <button className="btn-primary !py-2" disabled={busy || !value.trim()}>{busy ? "…" : "Ask"}</button>
    </form>
  );
}

/** A tutor conversation: renders replies (tables and diagrams included) and lets each reply be saved to the study sheet. */
export function ChatThread({ heading, suggestions, placeholder, send, saveTarget, saveLabel, access, emptyHint }: {
  heading?: string;
  suggestions: string[];
  placeholder: string;
  /** Streams the reply to `turns` (which end with the new user message), calling onText as text arrives. */
  send: (turns: Turn[], onText: (text: string) => void) => Promise<string>;
  /** Where saved replies go: a question (exam and topic come from it), or an exam plus a topic or a topic picker (study tutor). */
  saveTarget: { questionId?: string; exam?: string; target?: { topic?: string; sectionId?: number }; destinations?: { value: string; label: string }[]; backHref?: string };
  saveLabel?: string;
  access: SheetAccess;
  emptyHint?: ReactNode;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns([...next, { role: "assistant", content: "" }]);
    setDraft(""); setBusy(true); setError(null);
    try {
      await send(next.slice(-13), (t) => setTurns([...next, { role: "assistant", content: t }]));
    } catch (e) {
      setTurns(turns);
      setDraft(q);
      setError((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div>
      {heading && <h3 className="font-extrabold">{heading}</h3>}
      {turns.length === 0 && emptyHint}
      {turns.length > 0 && (
        <div className="mt-3 space-y-3">
          {turns.map((t, i) => t.role === "user" ? (
            <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3.5 py-2 text-sm text-on-brand">{t.content}</p>
          ) : (
            <div key={i} className="flex max-w-[95%] items-end gap-2">
            <Mia size={26} />
            <div className="min-w-0 flex-1 rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-3">
              {t.content ? <ChatMarkdown text={t.content} /> : <span className="text-sm text-muted">Mia is thinking…</span>}
              {t.content && !(busy && i === turns.length - 1) && (
                <div className="mt-2.5 border-t border-line pt-2">
                  <SaveToSheet small body={t.content} title={turns[i - 1]?.content.slice(0, 120)} access={access} label={saveLabel} {...saveTarget} />
                </div>
              )}
            </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {suggestions.map((s) => <button key={s} type="button" className="pill border border-line bg-surface text-soft hover:border-brand" disabled={busy} onClick={() => ask(s)}>{s}</button>)}
      </div>
      <Composer className="mt-3" value={draft} onChange={setDraft} onSend={() => ask(draft)} busy={busy} placeholder={placeholder} />
      {error && <p className="mt-2 text-sm font-semibold text-bad">{error}</p>}
    </div>
  );
}

const chatSuggestions = (answered: boolean) => answered
  ? ["Why exactly is my choice wrong?", "Give me a real-world example", "How would the exam try to trick me here?", "Show it as a table or diagram"]
  : ["What should I look for in the options?", "Give me a real-world analogy", "Show it as a table or diagram"];

const chatPlaceholder = (answered: boolean) => (answered ? "Ask anything about this question…" : "Ask about a term or requirement (Mia won't reveal the answer)");

function Chat({ sessionId, questionId, answered, access, backHref }: { sessionId: string; questionId: string; answered: boolean; access: SheetAccess; backHref?: string }) {
  return (
    <div className="mt-6 border-t border-line pt-5">
      <ChatThread heading="Still confused? Ask Mia" suggestions={chatSuggestions(answered)} access={access} saveTarget={{ questionId, backHref }}
        placeholder={chatPlaceholder(answered)}
        send={(turns, onText) => streamPost("/api/ai/chat", { sessionId, questionId, turns }, onText)} />
    </div>
  );
}

// ---------- Mia's panel (practice) ----------

/** A pulsing green dot that marks the call to action (still for people who prefer reduced motion). */
function Blinker() {
  return (
    <span className="relative mr-2 inline-flex h-2.5 w-2.5 flex-none align-middle" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75 motion-reduce:animate-none" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ok" />
    </span>
  );
}

/** One thing in Mia's timeline for a question: a chat turn, or the breakdown card. */
type Entry =
  | { kind: "user" | "assistant"; content: string }
  | { kind: "breakdown"; breakdown: Breakdown };

/**
 * Mia beside a practice question. Everything about the question lives in one timeline: the breakdown and the chat. One "Break it down for me" button starts the breakdown, so there's no separate button
 * under the question. Wide screens: it fills the sticky right column. Phones: a floating button that opens a sheet.
 */
export function MiaPanel({ sessionId, questionId, questionNumber, answered, sheetAccess, backHref, height }: {
  sessionId: string; questionId: string; questionNumber: number; answered: boolean; sheetAccess: SheetAccess; backHref?: string;
  /** Wide screens: the panel's height (80% of the question card); it never goes below 440px or above the screen. */
  height?: number;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState<null | "breakdown" | "chat">(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false); // phones
  const [lift, setLift] = useState(16); // phones: the floating button's distance from the bottom
  const scrollRef = useRef<HTMLDivElement>(null);
  // The latest timeline for the async handlers below (they outlive the render that created them).
  const entriesRef = useRef(entries);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  // Phones: when the Check / Next row is near the bottom of the screen, the floating button moves up above it.
  useEffect(() => {
    const place = () => {
      const row = document.querySelector("[data-quiz-actions]")?.getBoundingClientRect();
      const zone = window.innerHeight - 72;
      setLift(row && row.bottom > zone && row.top < window.innerHeight ? Math.round(window.innerHeight - row.top + 10) : 16);
    };
    const resized = new ResizeObserver(place);
    resized.observe(document.body);
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => { resized.disconnect(); window.removeEventListener("scroll", place); window.removeEventListener("resize", place); };
  }, []);

  // Chat replies: follow the newest line as it streams in. A breakdown: show it from its top so it can be read from the
  // start (once, when it arrives).
  const anchored = useRef(-1);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = entries.length - 1;
    const kind = entries[last]?.kind;
    if (kind === "breakdown") {
      if (anchored.current === last) return;
      anchored.current = last;
      const card = el.querySelector<HTMLElement>(`[data-entry="${last}"]`);
      if (card) el.scrollTop = card.offsetTop - el.offsetTop - 8;
    } else el.scrollTop = el.scrollHeight;
  }, [entries, busy]);

  const brokenDown = entries.some((e) => e.kind === "breakdown");
  const replace = (i: number, e: Entry) => setEntries((list) => list.map((x, j) => (j === i ? e : x)));

  const breakdown = async () => {
    setBusy("breakdown"); setError(null);
    try {
      const res = await fetch("/api/ai/breakdown", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, questionId }) });
      if (!res.ok) throw new Error(await readError(res));
      const { breakdown } = await res.json();
      setEntries((list) => [...list, { kind: "breakdown", breakdown }]);
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    // Only the chat turns go to the model; the breakdown card is for the learner.
    const turns: Turn[] = [...entriesRef.current.filter((e): e is Extract<Entry, { kind: "user" | "assistant" }> => e.kind === "user" || e.kind === "assistant")
      .map((e) => ({ role: e.kind, content: e.content })), { role: "user", content: q }];
    const i = entriesRef.current.length;
    setEntries((list) => [...list, { kind: "user", content: q }, { kind: "assistant", content: "" }]);
    setDraft(""); setBusy("chat"); setError(null);
    try {
      await streamPost("/api/ai/chat", { sessionId, questionId, turns: turns.slice(-13) }, (t) => replace(i + 1, { kind: "assistant", content: t }));
    } catch (e) {
      setEntries((list) => list.slice(0, i));
      setDraft(q);
      setError((e as Error).message);
    } finally { setBusy(null); }
  };

  const save = (title: string, body: string) => <SaveToSheet small title={title} body={body} questionId={questionId} access={sheetAccess} backHref={backHref} />;

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Ask Mia about this question" style={{ bottom: lift }}
          className="fixed right-4 z-40 flex items-center gap-2 rounded-full bg-brand py-1.5 pr-4 pl-1.5 text-sm font-bold text-on-brand shadow-lg transition-[bottom] duration-150 lg:hidden">
          <Mia size={34} /> Ask Mia
        </button>
      )}
      <aside aria-label="Mia, your AI tutor" style={{ "--mia-h": `${Math.max(height ?? 0, 440)}px` } as React.CSSProperties}
        className={`${open ? "flex" : "hidden"} fixed inset-x-0 bottom-0 z-50 h-[78vh] flex-col rounded-t-2xl border-t border-line bg-surface p-4 shadow-2xl
          lg:sticky lg:top-4 lg:z-auto lg:flex lg:h-[min(var(--mia-h),calc(100dvh-2rem))] lg:self-start lg:rounded-2xl lg:border lg:shadow-none`}>
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm"><b>Ask Mia about Q{questionNumber}</b> <span className="text-xs text-muted">· AI tutor{answered ? "" : " · won't give the answer away"}</span></p>
          <button type="button" className="text-xs font-bold text-soft hover:text-brand lg:hidden" onClick={() => setOpen(false)}>Minimise</button>
        </div>

        {/* Once the chat has started, the button moves up here; before that it sits under Mia's greeting. */}
        {!brokenDown && entries.length > 0 && (
          <button type="button" disabled={!!busy} onClick={breakdown}
            className="mt-3 flex-none rounded-xl border border-brand/50 bg-brand-soft px-3 py-2 text-left text-sm font-bold transition hover:border-brand disabled:opacity-60">
            <Blinker />Break it down for me
          </button>
        )}

        <div ref={scrollRef} className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {entries.length === 0 && !busy && (
            <div className="flex items-end gap-2">
              <MiaPose pose="welcoming" height={104} className="-ml-1" />
              <div className="mb-2 min-w-0 flex-1">
                <p className="rounded-2xl rounded-bl-sm bg-brand-soft px-3 py-2 text-sm">
                  {answered ? <>Want to understand Q{questionNumber} better? Tap below, or ask me anything.</> : <>Stuck on Q{questionNumber}? Tap below and I&apos;ll break it down, or ask me about any term.</>}
                </p>
                <button type="button" onClick={breakdown}
                  className="mt-2 w-full rounded-xl border border-brand/50 bg-brand-soft px-3 py-2 text-left text-sm font-bold transition hover:border-brand">
                  <Blinker />Break it down for me
                </button>
              </div>
            </div>
          )}
          {entries.map((e, i) => {
            if (e.kind === "user") return <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3.5 py-2 text-sm text-on-brand">{e.content}</p>;
            if (e.kind === "breakdown") {
              return (
                <div key={i} data-entry={i} className="rounded-2xl border border-brand/30 bg-bg p-3">
                  <p className="mb-1 flex items-center gap-2 text-xs font-bold text-brand"><Mia size={18} />Mia&apos;s breakdown</p>
                  <BreakdownView b={e.breakdown} save={save} narrow />
                </div>
              );
            }
            return (
              <div key={i} className="flex max-w-[96%] items-end gap-2">
                <Mia size={24} />
                <div className="min-w-0 flex-1 rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2.5">
                  {e.content ? <ChatMarkdown text={e.content} /> : <span className="text-sm text-muted">Mia is thinking…</span>}
                  {e.content && !(busy === "chat" && i === entries.length - 1) && (
                    <div className="mt-2 border-t border-line pt-2">{save(entries[i - 1]?.kind === "user" ? (entries[i - 1] as { content: string }).content.slice(0, 120) : "Mia's answer", e.content)}</div>
                  )}
                </div>
              </div>
            );
          })}
          {busy === "breakdown" && (
            <div className="flex items-center gap-3" aria-live="polite">
              <MiaThinking height={72} />
              <p className="text-sm text-soft"><b className="text-ink">Mia is reading the question</b>… the first time anyone asks this takes up to half a minute; after that it&apos;s instant.</p>
            </div>
          )}
          {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
        </div>

        <Composer className="mt-3" value={draft} onChange={setDraft} onSend={() => ask(draft)} busy={!!busy} placeholder={chatPlaceholder(answered)} />
        <p className="mt-2 text-[11px] text-muted">AI-written explanations can make mistakes. When in doubt, check the linked AWS documentation.</p>
      </aside>
    </>
  );
}

// ---------- Panel (results page) ----------

interface TutorProps {
  sessionId: string;
  questionId: string;
  answered: boolean;
  /** Pass holders can save tutor content to their study sheet; others see the button as an upsell. */
  sheetAccess: SheetAccess;
  /** The page to come back to from the study sheet after saving (this question in its session, or the results). */
  backHref?: string;
}

/** "Break it down" and "Explain the answer" with follow-up questions, inline under a question (results page). */
export function Tutor({ sessionId, questionId, answered, sheetAccess, backHref }: TutorProps) {
  const [view, setView] = useState<"none" | "breakdown" | "answer">("none");
  const [current, setCurrent] = useState<Breakdown | null>(null);
  const [answer, setAnswer] = useState("");
  const [answerDone, setAnswerDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openBreakdown = async () => {
    setView("breakdown"); setError(null);
    if (current) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/breakdown", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, questionId }) });
      if (!res.ok) throw new Error(await readError(res));
      setCurrent((await res.json()).breakdown);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  };

  const openAnswer = async () => {
    setView("answer"); setError(null);
    if (answer) return;
    setLoading(true);
    try { await streamPost("/api/ai/explain", { sessionId, questionId }, (t) => { setAnswer(t); setLoading(false); }); setAnswerDone(true); }
    catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  };

  const shown = view === "breakdown" ? current : null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={view === "breakdown" ? "btn-primary !py-2" : "btn-ghost !py-2"} onClick={() => (view === "breakdown" ? setView("none") : openBreakdown())}>
          <Mia size={20} /> {view === "breakdown" ? "Hide breakdown" : "Break it down for me"}
        </button>
        {answered && (
          <button type="button" className={view === "answer" ? "btn-primary !py-2" : "btn-ghost !py-2"} onClick={() => (view === "answer" ? setView("none") : openAnswer())}>
            <span aria-hidden>💡</span> {view === "answer" ? "Hide walk-through" : "Explain the answer step by step"}
          </button>
        )}
      </div>

      {view !== "none" && (
        <div className="mt-3 rounded-2xl border-[1.5px] border-brand/40 bg-surface p-4 shadow-sm md:p-6">
          <p className="eyebrow flex items-center gap-2 text-brand"><Mia size={22} />Mia · AI tutor{view === "breakdown" && !answered ? " · won't reveal the answer" : ""}</p>
          <div className="mt-3">
            {loading && !shown && !answer ? (
              <div className="flex items-start gap-4" aria-live="polite">
                <MiaThinking height={96} className="-mb-2 hidden sm:block" />
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-sm text-soft"><b className="text-ink">Mia is reading the question</b> and writing your {view === "answer" ? "walk-through" : "breakdown"}… The first time anyone opens a question this takes up to half a minute; after that it&apos;s instant.</p>
                  {[80, 95, 60, 90].map((w, i) => <div key={i} className="h-3.5 animate-pulse rounded bg-line" style={{ width: `${w}%` }} />)}
                </div>
              </div>
            ) : error ? (
              <p className="rounded-xl bg-bad-soft px-4 py-2 text-sm font-semibold text-bad">{error}</p>
            ) : view === "breakdown" && shown ? (
              <BreakdownView b={shown} save={(title, body) => <SaveToSheet small title={title} body={body} questionId={questionId} access={sheetAccess} backHref={backHref} />} />
            ) : view === "answer" && answer ? (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <MiaPose pose="reviewing" height={64} />
                  <p className="font-extrabold">Mia walks you through it</p>
                </div>
                <MiniMarkdown text={answer} />
                {answerDone && <div className="mt-3"><SaveToSheet title="Answer walk-through" body={answer} questionId={questionId} access={sheetAccess} backHref={backHref} /></div>}
              </>
            ) : null}
          </div>
          {(shown || answer) && !error && <Chat sessionId={sessionId} questionId={questionId} answered={answered} access={sheetAccess} backHref={backHref} />}
          <p className="mt-4 text-xs text-muted">AI-written explanations can make mistakes. When in doubt, check the linked AWS documentation.</p>
        </div>
      )}
    </div>
  );
}
