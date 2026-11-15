"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveClipAction } from "@/app/study/actions";
import type { Breakdown } from "@/lib/ai";

/** "📌 Save to study sheet" for a piece of tutor content (markdown in the chat format: tables and ```flow diagrams included). */
export function SaveToSheet({ body, title, questionId, exam, signedIn, small }: {
  body: string; title?: string; questionId?: string; exam?: string; signedIn: boolean; small?: boolean;
}) {
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [savedExam, setSavedExam] = useState(exam);
  const [pending, start] = useTransition();
  const size = small ? "!px-2 !py-0.5 !text-[11px]" : "!px-2.5 !py-1 !text-xs";

  if (!signedIn) {
    return <Link href="/register" className={`btn-ghost ${size}`} title="Create a free account to save to your study sheet">📌 Save to study sheet</Link>;
  }
  if (state === "saved") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold text-ok ${small ? "text-[11px]" : "text-xs"}`}>
        ✓ Saved{savedExam && <Link href={`/study/${savedExam}`} className="font-bold text-brand underline">View sheet</Link>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className={`btn-ghost ${size}`} disabled={pending}
        onClick={() => start(async () => {
          const r = await saveClipAction({ body, title, questionId, exam });
          if (r.ok) { setState("saved"); setSavedExam(r.exam); }
          else { setState("error"); setMessage(r.error); }
        })}>
        {pending ? "Saving…" : "📌 Save to study sheet"}
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
