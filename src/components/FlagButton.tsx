"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setFlagAction } from "@/app/actions";

export function FlagButton({ flagged, onChange }: { flagged: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={flagged}
      onClick={() => onChange(!flagged)}
      className={`pill shrink-0 gap-1.5 border transition ${flagged ? "border-warn bg-warn-soft text-warn" : "border-line bg-surface text-soft hover:text-ink"}`}
    >
      <span aria-hidden>🚩</span> {flagged ? "Flagged as weak" : "Flag as weak"}
    </button>
  );
}

/** Self-contained flag toggle for pages outside the quiz player (e.g. results). */
export function SessionFlagButton({ sessionId, questionId, initial }: { sessionId: string; questionId: string; initial: boolean }) {
  const [flagged, setFlagged] = useState(initial);
  const router = useRouter();
  return (
    <FlagButton
      flagged={flagged}
      onChange={(on) => {
        setFlagged(on);
        setFlagAction(sessionId, questionId, on).then((r) => { if (r.ok) router.refresh(); else setFlagged(!on); }, () => setFlagged(!on));
      }}
    />
  );
}
