"use client";

import { useEffect, useState } from "react";
import type { ConceptCard } from "@/lib/ai";
import { ConceptCardBody } from "./StudyCards";

// Cards are written one at a time so a long sheet doesn't fire dozens of requests at once.
let queue: Promise<unknown> = Promise.resolve();

/** Shows a topic's concept card, asking the tutor to write it the first time anyone needs it. */
export function CardLoader({ exam, topic, compact }: { exam: string; topic: string; compact?: boolean }) {
  const [card, setCard] = useState<ConceptCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    const job = queue.then(async () => {
      if (!live) return;
      const res = await fetch("/api/ai/card", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exam, topic }) });
      const j = await res.json().catch(() => ({}));
      if (!live) return;
      if (res.ok) setCard(j.card); else setError(j.error ?? "Couldn't write this card.");
    }).catch(() => live && setError("Couldn't write this card."));
    queue = job;
    return () => { live = false; };
  }, [exam, topic, attempt]);

  if (card) return <ConceptCardBody card={card} compact={compact} />;
  if (error) return (
    <p className="text-sm text-bad">{error} <button className="font-bold underline" onClick={() => { setError(null); setAttempt((a) => a + 1); }}>Retry</button></p>
  );
  return (
    <div className="space-y-2" aria-label="Writing this card">
      <p className="text-xs text-muted">The tutor is writing this card…</p>
      {[90, 70, 80].map((w, i) => <div key={i} className="h-3 animate-pulse rounded bg-line" style={{ width: `${w}%` }} />)}
    </div>
  );
}

export function PrintButton() {
  return <button className="btn-primary" onClick={() => window.print()}>Print or save as PDF</button>;
}
