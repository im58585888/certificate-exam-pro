"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { retryMistakesAction } from "@/app/study/actions";
import type { GapMistake, ResolvedPlan, ServiceRecord } from "@/lib/gaps";
import { Mia, MiaPose } from "./Mia";
import { AddNote, ItemCard, type SheetItem } from "./StudyNotes";
import { ChatThread, streamPost } from "./Tutor";
import s from "./StudyByService.module.css";

// The study sheet (pass holders): Mia's take on what to fix first, then every open mistake grouped by the AWS service
// it tests (Mia's grouping; word matching until hers arrives), with the tutor docked on the right, focused on the open
// service. Saved notes sit behind "My notes" at the bottom.

const TOP = 5;

export function StudyByService({ exam, examCode, mistakes, records, initialPlan, tutorOn, notes, destinations }: {
  exam: string;
  examCode: string;
  mistakes: GapMistake[];
  records: Record<string, ServiceRecord>;
  initialPlan: ResolvedPlan;
  tutorOn: boolean;
  notes: SheetItem[];
  destinations: { value: string; label: string }[];
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [loading, setLoading] = useState(tutorOn && !initialPlan.byMia && mistakes.length > 0);
  const [open, setOpen] = useState<string | null>(initialPlan.groups[0]?.service ?? null);
  const [all, setAll] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false); // phones only; always shown on wide screens
  const [pending, setPending] = useState<{ text: string; n: number } | undefined>();

  // Mia sorts the mistakes when there's no saved grouping for them yet.
  useEffect(() => {
    if (!loading) return;
    let live = true;
    fetch("/api/ai/study-plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exam }) })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (live) { setPlan(d.plan); setOpen((o) => (d.plan.groups.some((g: { service: string }) => g.service === o) ? o : d.plan.groups[0]?.service ?? null)); } })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [loading, exam]);

  const byId = new Map(mistakes.map((m) => [m.id, m]));
  const groups = plan.groups.map((g) => ({ ...g, items: g.ids.map((id) => byId.get(id)).filter((m): m is GapMistake => !!m) })).filter((g) => g.items.length);
  const shown = all ? groups : groups.slice(0, TOP);
  const focusGroup = groups.find((g) => g.service === open) ?? null;
  const focusTopic = focusGroup?.items[0]?.topic;
  const askMia = (text: string) => { setPending((p) => ({ text, n: (p?.n ?? 0) + 1 })); setTutorOpen(true); };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <Take plan={plan} loading={loading} count={mistakes.length} exam={exam} onPick={(svc) => {
          setOpen(svc);
          if (groups.findIndex((g) => g.service === svc) >= TOP) setAll(true);
          setTimeout(() => document.getElementById(`svc-${svc}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        }} />

        {groups.length > 0 && (
          <>
            <div className="mt-7 mb-2.5 flex flex-wrap items-baseline justify-between gap-2 px-0.5">
              <h2 className="text-lg font-extrabold tracking-tight">Missed questions by AWS service</h2>
              <p className="text-sm text-muted">{mistakes.length} to fix · {groups.length} {groups.length === 1 ? "service" : "services"}</p>
            </div>
            <div className="grid gap-2.5">
              {shown.map((g) => (
                <ServiceRow key={g.service} exam={exam} service={g.service} items={g.items} record={records[g.service]} open={open === g.service}
                  onToggle={() => setOpen(open === g.service ? null : g.service)} tutorOn={tutorOn}
                  onAsk={() => askMia(`Teach me ${g.service} for the ${examCode} exam, focused on what I got wrong: what it does, when to choose it, and the traps in exam questions. Use a table or diagram if it helps.`)} />
              ))}
            </div>
            {groups.length > TOP && (
              <button type="button" className="mt-3 text-sm font-extrabold text-brand hover:underline" onClick={() => setAll(!all)}>
                {all ? "Show fewer services" : `Show ${groups.length - TOP} more service${groups.length - TOP === 1 ? "" : "s"}`}
              </button>
            )}
          </>
        )}

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
          <button type="button" className="text-brand hover:underline" aria-expanded={showNotes} onClick={() => setShowNotes(!showNotes)}>
            {showNotes ? "Hide my notes" : `My notes · ${notes.length}`}
          </button>
          <Link className="text-brand hover:underline" href={`/study/${exam}/cheatsheet`}>Printable cheat sheet</Link>
          <Link className="text-soft hover:text-brand hover:underline" href={`/practice/${exam}`}>Practice</Link>
        </div>
        {showNotes && (
          <section className="card mt-3 space-y-2.5 p-4" aria-label="My notes">
            {notes.length === 0 && <p className="text-sm text-soft">Nothing saved yet. Use <b>Save to my notes</b> under any answer from Mia, or write your own note.</p>}
            {notes.map((n) => <ItemCard key={n.id} item={n} destinations={destinations} />)}
            {(focusTopic || destinations[0]) && <AddNote exam={exam} target={focusTopic ? { topic: focusTopic } : parseTarget(destinations[0].value)} />}
          </section>
        )}
      </div>

      {tutorOn && (
        <TutorPanel exam={exam} examCode={examCode} focus={focusGroup?.service ?? null} focusTopic={focusTopic} destinations={destinations}
          open={tutorOpen} setOpen={setTutorOpen} onClearFocus={() => setOpen(null)} pending={pending} />
      )}
    </div>
  );
}

const parseTarget = (v: string) => (v.startsWith("s:") ? { sectionId: Number(v.slice(2)) } : { topic: v.slice(2) });

/** Mia's take: big Mia, her read on the pattern, and the three services to work on first. */
function Take({ plan, loading, count, exam, onPick }: { plan: ResolvedPlan; loading: boolean; count: number; exam: string; onPick: (service: string) => void }) {
  const empty = count === 0;
  return (
    <section className={`card ${s.take}`} aria-label="Mia's take">
      <div className={s.stage}>
        <span className={s.glow} aria-hidden="true" />
        <span className={s.mia}><MiaPose pose={empty ? "welcoming" : "reviewing"} height={280} alt="Mia, your AI tutor" priority /></span>
      </div>
      <div className={s.say}>
        <span className={s.tag}><span className={s.dot} aria-hidden="true" />Mia&apos;s take{empty ? "" : " · after your last session"}</span>
        {empty ? (
          <>
            <p className={s.bubble}>Nothing to fix right now. Practise a few more questions and I&apos;ll show you which AWS services to focus on.</p>
            <Link className="btn-primary mt-4" href={`/practice/${exam}`}>Start practising</Link>
          </>
        ) : loading ? (
          <p className={`${s.bubble} animate-pulse text-soft`}>Reading your {count} missed question{count === 1 ? "" : "s"} and sorting them by AWS service…</p>
        ) : (
          <>
            <p className={s.bubble}>{plan.summary || `Here are the AWS services where you've missed the most. Start at the top.`}</p>
            <ol className={s.focus}>
              {plan.focus.map((f, i) => (
                <li key={f.service}>
                  <button type="button" className={s.f} onClick={() => onPick(f.service)}>
                    <span className={s.n}>{i + 1}</span>
                    <span className="min-w-0"><b>{f.service}</b>{f.why && <small>{f.why}</small>}</span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}

function ServiceRow({ exam, service, items, record, open, onToggle, tutorOn, onAsk }: {
  exam: string; service: string; items: GapMistake[]; record?: ServiceRecord; open: boolean; onToggle: () => void; tutorOn: boolean; onAsk: () => void;
}) {
  // Record: right answers about this service, against everything answered about it (its open mistakes included).
  const wrong = new Set([...(record?.wrong ?? []), ...items.map((m) => m.id)]);
  const right = record?.right ?? 0;
  const total = right + wrong.size;
  const pct = total ? Math.round((right / total) * 100) : 0;
  const doc = items.find((m) => m.doc)?.doc;
  return (
    <div id={`svc-${service}`} className={`scroll-mt-4 overflow-hidden rounded-2xl border bg-surface ${open ? "border-brand/40 shadow-[0_12px_30px_-24px_rgba(70,40,140,.5)]" : "border-line"}`}>
      <button type="button" className="flex w-full items-center gap-3 px-4 py-3.5 text-left" aria-expanded={open} onClick={onToggle}>
        <span aria-hidden="true" className={`text-xs text-muted transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        <span className="min-w-0 flex-1 font-extrabold">{service} <span className="ml-1 text-sm font-semibold text-muted">· {items.length} to fix</span></span>
        <span className="w-24 text-right text-xs text-muted">
          {right}/{total} right
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line"><span className={`block h-full rounded-full ${pct < 50 ? "bg-bad" : pct < 75 ? "bg-warn" : "bg-ok"}`} style={{ width: `${Math.max(pct, 5)}%` }} /></span>
        </span>
      </button>
      {open && (
        <div className="border-t border-line px-4 pt-1 pb-4 sm:pl-10">
          {items.map((m) => (
            <article key={m.id} className="border-b border-dashed border-line py-3 last:border-0">
              <p className="font-semibold leading-relaxed">{m.question}</p>
              <p className="mt-1.5 flex flex-wrap gap-1.5 text-[13px] font-bold">
                <span className="rounded-full bg-bad-soft px-2.5 py-0.5 text-bad">You: {m.you}</span>
                <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-ok">Answer: {m.answer}</span>
              </p>
              <form action={retryMistakesAction} className="mt-1.5 text-sm text-soft">
                <input type="hidden" name="exam" value={exam} /><input type="hidden" name="id" value={m.id} />
                Remember: {m.remember} · <button className="font-bold text-brand hover:underline">Review question</button>
              </form>
            </article>
          ))}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold">
            {record?.sheet && <Link href={`/aws/${record.sheet}`} className="text-brand hover:underline">Cheat sheet</Link>}
            {doc && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-soft hover:text-ink hover:underline">AWS docs ↗</a>}
            {tutorOn && <button type="button" className="text-brand hover:underline" onClick={onAsk}>Ask Mia about {service}</button>}
            {items.length > 1 && (
              <form action={retryMistakesAction}>
                <input type="hidden" name="exam" value={exam} />
                {items.slice(0, 20).map((m) => <input key={m.id} type="hidden" name="id" value={m.id} />)}
                <button className="btn-ghost !px-3 !py-1 text-xs">Practise these {Math.min(items.length, 20)} again</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** The study tutor: docked on the right and kept in view on wide screens, a bottom sheet behind a button on phones. */
function TutorPanel({ exam, examCode, focus, focusTopic, destinations, open, setOpen, onClearFocus, pending }: {
  exam: string; examCode: string; focus: string | null; focusTopic?: string; destinations: { value: string; label: string }[];
  open: boolean; setOpen: (v: boolean) => void; onClearFocus: () => void; pending?: { text: string; n: number };
}) {
  const suggestions = focus
    ? [`Quiz me on ${focus}`, `Explain ${focus} simply`, `Compare ${focus} with similar services in a table`]
    : ["Quiz me on my weak services", exam === "aif-c01" ? "Compare Bedrock, SageMaker and Amazon Q" : "Compare RDS, Aurora and DynamoDB", "Draw how a VPC connects to the internet"];
  return (
    <>
      {!open && <button className="btn-primary fixed right-4 bottom-4 z-40 shadow-lg lg:hidden" onClick={() => setOpen(true)}><Mia size={22} /> Ask Mia</button>}
      <aside aria-label="AI tutor"
        className={`${open ? "flex" : "hidden"} fixed inset-x-0 bottom-0 z-50 max-h-[80vh] flex-col overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-5 shadow-2xl
          lg:sticky lg:top-4 lg:z-auto lg:flex lg:max-h-[calc(100vh-2rem)] lg:self-start lg:rounded-2xl lg:border lg:shadow-none`}>
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2.5 font-extrabold"><Mia size={36} /><span>Mia<span className="block text-xs font-semibold text-muted">{focus ? `AI tutor · focused on ${focus}` : "AI tutor"}</span></span></p>
          <button className="text-xs font-bold text-soft lg:hidden" onClick={() => setOpen(false)}>Close</button>
        </div>
        {focus && <p className="mt-1 text-xs text-muted"><button className="font-bold text-brand" onClick={onClearFocus}>Ask about anything in {examCode}</button></p>}
        <div className="mt-2">
          <ChatThread access="ok" suggestions={suggestions} pending={pending}
            emptyHint={
              <div className="mt-2 flex items-end gap-2">
                <MiaPose pose="welcoming" height={110} className="-ml-2" />
                <p className="mb-3 rounded-2xl rounded-bl-sm bg-brand-soft px-3 py-2 text-sm text-ink">
                  {focus ? <>Let&apos;s work on <b>{focus}</b>. Ask me anything, or tap a suggestion.</> : <>Open a service and I&apos;ll focus on it, or ask me anything.</>}
                </p>
              </div>
            }
            saveTarget={focusTopic ? { exam, target: { topic: focusTopic } } : { exam, destinations }}
            saveLabel="Save to my notes"
            placeholder={focus ? `Ask about ${focus}…` : "Ask anything, or ask for a table or diagram…"}
            send={(turns, onText) => streamPost("/api/ai/study-chat", { exam, topic: focus ?? undefined, turns }, onText)} />
        </div>
      </aside>
    </>
  );
}
