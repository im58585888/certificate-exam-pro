"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveClipAction } from "@/app/study/actions";
import type { Breakdown } from "@/lib/ai";
import { upsellHref, type SheetAccess } from "@/lib/sheetAccess";

/**
 * "📌 Save to study sheet" for a piece of tutor content (markdown in the chat format: tables and ```flow diagrams included).
 * It's a pass feature: without one the button still shows and leads to sign-up or the pass.
 */
export function SaveToSheet({ body, title, questionId, exam, target, destinations, access, small, label = "Save to study sheet" }: {
  body: string; title?: string; questionId?: string; exam?: string; target?: { topic?: string; sectionId?: number };
  /** Lets the learner pick the topic (study tutor answers that aren't tied to one topic). Values are "t:<topic>" or "s:<id>". */
  destinations?: { value: string; label: string }[];
  access: SheetAccess; small?: boolean; label?: string;
}) {
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [savedExam, setSavedExam] = useState(exam);
  const [dest, setDest] = useState(destinations?.[0]?.value ?? "");
  const [pending, start] = useTransition();
  const size = small ? "!px-2 !py-0.5 !text-[11px]" : "!px-2.5 !py-1 !text-xs";

  if (access !== "ok") {
    return (
      <Link href={upsellHref(access)} className={`btn-ghost ${size}`} title="The study sheet is part of the exam pass">
        📌 {label} <span className="pill bg-brand-soft !px-1.5 !py-0 text-[10px] text-brand">Pass</span>
      </Link>
    );
  }
  if (state === "saved") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold text-ok ${small ? "text-[11px]" : "text-xs"}`}>
        ✓ Saved{savedExam && <Link href={`/study/${savedExam}`} className="font-bold text-brand underline">View sheet</Link>}
      </span>
    );
  }
  const chosen = (): { topic?: string; sectionId?: number } | undefined =>
    destinations ? (dest.startsWith("s:") ? { sectionId: Number(dest.slice(2)) } : { topic: dest.slice(2) }) : target;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {destinations && (
        <select aria-label="Save to topic" className="max-w-48 rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs text-soft" value={dest} onChange={(e) => setDest(e.target.value)}>
          {destinations.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      )}
      <button type="button" className={`btn-ghost ${size}`} disabled={pending || (!!destinations && !dest)}
        onClick={() => start(async () => {
          const r = await saveClipAction({ body, title, questionId, exam, target: chosen() });
          if (r.ok) { setState("saved"); setSavedExam(r.exam); }
          else { setState("error"); setMessage(r.error); }
        })}>
        {pending ? "Saving…" : `📌 ${label}`}
      </button>
      {state === "error" && <span className="text-xs font-semibold text-bad">{message}</span>}
    </span>
  );
}

// ---------- Breakdown parts as savable markdown ----------

const cell = (s: string) => s.replace(/\|/g, "/").replace(/\n/g, " ");

export function tableMarkdown(t: NonNullable<Breakdown["table"]>): string {
  // The caption becomes the saved item's title, so the body is just the table.
  return [`| ${t.columns.map(cell).join(" | ")} |`, `|${t.columns.map(() => "---").join("|")}|`, ...t.rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
}

export function pictureMarkdown(p: NonNullable<Breakdown["picture"]>): string {
  return ["```flow", `title: ${p.caption}`, ...p.steps.map((s) => `${s.label} | ${s.note}`), "```"].join("\n");
}

export function cluesMarkdown(clues: Breakdown["clues"]): string {
  return clues.map((c) => `- **"${c.phrase}"** ${c.meaning}`).join("\n");
}

export function termsMarkdown(terms: Breakdown["terms"]): string {
  return terms.map((t) => `- **${t.term}:** ${t.plain}${t.example ? ` Example: ${t.example}` : ""}`).join("\n");
}

export function optionsMarkdown(options: Breakdown["options"]): string {
  return options.map((o) => `- **${o.name}:** ${o.what} Think of it as: ${o.analogy}`).join("\n");
}
