"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GapReport } from "@/lib/gaps";
import { Mia } from "./Mia";

type Note = { summary: string; tips: string[] };

/**
 * "Your gaps" on the study sheet: Mia's diagnosis, the AWS services to deep dive, the services the learner mixes up,
 * and the concepts behind their open mistakes. "Ask Mia" buttons send a ready-made question to the tutor beside it.
 */
export function GapsPanel({ exam, examCode, gaps, tutorOn, onAsk, onOpenTopic }: {
  exam: string;
  examCode: string;
  gaps: GapReport;
  tutorOn: boolean;
  onAsk: (text: string) => void;
  onOpenTopic: (topic: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [all, setAll] = useState(false);
  const TOP = 4;
  const more = gaps.services.length > TOP || gaps.concepts.length > TOP || gaps.mixups.length > TOP;
  if (!gaps.mistakeIds.length) return null;
  const n = gaps.mistakeIds.length;
  return (
    <section className="card mb-6 overflow-hidden" aria-labelledby="gaps-title">
      <button type="button" className="flex w-full items-center gap-3 p-5 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Mia size={36} />
        <span className="min-w-0 flex-1">
          <span id="gaps-title" className="block font-extrabold">Your gaps</span>
          <span className="block text-sm text-soft">What your {n} open mistake{n === 1 ? "" : "s"} say you should deep dive</span>
        </span>
        <span className="text-sm font-bold text-brand">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="border-t border-line px-5 pb-5">
          {tutorOn && <Diagnosis exam={exam} />}

          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            {gaps.services.length > 0 && (
              <div>
                <h3 className="eyebrow">AWS services to deep dive</h3>
                <ul className="mt-2 grid gap-2">
                  {gaps.services.slice(0, all ? undefined : TOP).map((s) => {
                    const pct = s.total ? Math.round((s.right / s.total) * 100) : 0;
                    return (
                      <li key={s.id} className="rounded-xl border border-line bg-bg px-3.5 py-2.5">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <b>{s.name}</b>
                          <span className="text-xs text-muted">missed {s.missed} · {s.right}/{s.total} right</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                          <div className={`h-full rounded-full ${pct < 50 ? "bg-bad" : pct < 75 ? "bg-warn" : "bg-ok"}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                        </div>
                        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
                          {s.sheet && <Link href={`/aws/${s.sheet}`} className="text-brand hover:underline">Cheat sheet</Link>}
                          {s.doc && <a href={s.doc.url} target="_blank" rel="noopener noreferrer" className="text-soft hover:text-ink hover:underline">AWS docs ↗</a>}
                          {tutorOn && (
                            <button type="button" className="text-brand hover:underline"
                              onClick={() => onAsk(`Teach me ${s.name} for the ${examCode} exam: what it does, when to choose it over similar services, and the traps exam questions set. Use a table or diagram if it helps.`)}>
                              Ask Mia to explain
                            </button>
                          )}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="grid content-start gap-6">
              {gaps.mixups.length > 0 && (
                <div>
                  <h3 className="eyebrow">Services you mix up</h3>
                  <ul className="mt-2 grid gap-2">
                    {gaps.mixups.slice(0, all ? undefined : TOP).map((m) => (
                      <li key={`${m.picked}>${m.answer}`} className="rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px]">
                        <p>You picked <b className="text-bad">{m.picked}</b> when the answer was <b className="text-ok">{m.answer}</b>{m.count > 1 && <span className="text-xs text-muted"> · {m.count}×</span>}</p>
                        <p className="mt-1 flex flex-wrap gap-x-3 text-xs font-bold">
                          {m.compare && <Link href={`/aws/compare/${m.compare}`} className="text-brand hover:underline">Read the comparison</Link>}
                          {tutorOn && (
                            <button type="button" className="text-brand hover:underline"
                              onClick={() => onAsk(`Compare ${m.picked} and ${m.answer} in a table for the ${examCode} exam: what each does, when to use which, and the clue words in a question that point to each.`)}>
                              Ask Mia to compare
                            </button>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {gaps.concepts.length > 0 && (
                <div>
                  <h3 className="eyebrow">Concepts you keep missing</h3>
                  <ul className="mt-2 grid gap-2">
                    {gaps.concepts.slice(0, all ? undefined : TOP).map((c) => (
                      <li key={c.topic} className="rounded-xl border border-line bg-bg px-3.5 py-2.5">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <b>{c.topic}</b>
                          <span className="text-xs text-muted">{c.missed} to fix</span>
                          <button type="button" className="ml-auto text-xs font-bold text-brand hover:underline" onClick={() => onOpenTopic(c.topic)}>Open topic</button>
                        </div>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-soft">
                          {c.concepts.map((line) => <li key={line}>{line}</li>)}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          {more && (
            <button type="button" className="mt-4 text-sm font-bold text-brand hover:underline" onClick={() => setAll(!all)}>
              {all ? "Show less" : "Show all gaps"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** Mia's written read on the pattern behind the gaps, fetched after the page loads and saved until the mistakes change. */
function Diagnosis({ exam }: { exam: string }) {
  const [note, setNote] = useState<Note | null>(null);
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  useEffect(() => {
    let live = true;
    fetch("/api/ai/gaps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exam }) })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (live) { setNote(d.note); setState("done"); } })
      .catch(() => { if (live) setState("error"); });
    return () => { live = false; };
  }, [exam]);

  if (state === "error") return null;
  return (
    <div className="mt-4 rounded-xl bg-brand-soft px-4 py-3">
      <p className="text-xs font-bold text-brand">Mia&apos;s diagnosis</p>
      {state === "loading" ? (
        <p className="mt-1 animate-pulse text-sm text-soft">Mia is looking for the pattern in your mistakes…</p>
      ) : (
        <>
          <p className="mt-1 leading-relaxed text-ink">{note!.summary}</p>
          {note!.tips.length > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px] text-soft">
              {note!.tips.map((t) => <li key={t}>{t}</li>)}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
