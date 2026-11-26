"use client";

import { useEffect, useState } from "react";

type Note = { summary: string; tips: string[] };

/** Mia's written review of the session (summary and a few suggestions), fetched after the page loads. */
export function MiaReview({ sessionId }: { sessionId: string }) {
  const [note, setNote] = useState<Note | null>(null);
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  useEffect(() => {
    let live = true;
    fetch("/api/ai/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (live) { setNote(d.note); setState("done"); } })
      .catch(() => { if (live) setState("error"); });
    return () => { live = false; };
  }, [sessionId]);

  if (state === "error") return null;
  if (state === "loading") return <p className="mt-2 animate-pulse text-sm text-soft">Mia is reading your results…</p>;
  return (
    <div className="mt-2">
      <p className="leading-relaxed">{note!.summary}</p>
      {note!.tips.length > 0 && (
        <>
          <p className="mt-3 text-sm font-extrabold">Mia&apos;s suggestions</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-soft">
            {note!.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}
