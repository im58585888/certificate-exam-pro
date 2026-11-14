"use client";

import { Fragment, type ReactNode } from "react";
import { MiniMarkdown } from "./Tutor";

// The follow-up chat's renderer: the tutor's light markdown plus markdown tables (comparisons, matrices) and ```flow
// diagrams. It copes with half-streamed input, so tables and diagrams build up as the answer arrives.

type Block =
  | { kind: "text"; text: string }
  | { kind: "table"; rows: string[][] }
  | { kind: "flow"; title?: string; steps: { label: string; note?: string }[] }
  | { kind: "code"; text: string };

const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isDivider = (line: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  let prose: string[] = [];
  const flushProse = () => { if (prose.join("").trim()) blocks.push({ kind: "text", text: prose.join("\n") }); prose = []; };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const fence = line.match(/^```\s*(\w*)/);
    if (fence) {
      flushProse();
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith("```"); i++) body.push(lines[i]);
      if (["flow", "diagram"].includes(fence[1].toLowerCase())) {
        let title: string | undefined;
        const steps = body.map((l) => l.trim()).filter(Boolean).flatMap((l) => {
          const t = l.match(/^title:\s*(.+)/i);
          if (t) { title = t[1]; return []; }
          const [label, ...note] = l.replace(/^[-*]\s*/, "").split("|");
          return [{ label: label.trim(), note: note.join("|").trim() || undefined }];
        });
        blocks.push({ kind: "flow", title, steps });
      } else blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }
    if (line.startsWith("|")) {
      flushProse();
      const rows: string[][] = [];
      for (; i < lines.length && lines[i].trim().startsWith("|"); i++) if (!isDivider(lines[i])) rows.push(cells(lines[i]));
      i--;
      blocks.push({ kind: "table", rows });
      continue;
    }
    prose.push(lines[i]);
  }
  flushProse();
  return blocks;
}

function bold(s: string): ReactNode {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <b key={i} className="text-ink">{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>);
}

function ChatTable({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows;
  if (!head) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead><tr>{head.map((c, j) => <th key={j} className="border-b border-line bg-brand-soft px-3 py-2 font-bold text-ink">{bold(c)}</th>)}</tr></thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              {head.map((_, j) => <td key={j} className={`px-3 py-2 align-top ${j === 0 ? "font-semibold text-ink" : "text-soft"}`}>{bold(r[j] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChatFlow({ title, steps }: { title?: string; steps: { label: string; note?: string }[] }) {
  if (!steps.length) return null;
  return (
    <figure className="rounded-xl border border-line bg-surface p-3">
      {title && <figcaption className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{bold(title)}</figcaption>}
      <div className="flex flex-wrap items-stretch gap-2">
        {steps.map((s, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="self-center text-xl font-bold text-brand" aria-hidden>→</span>}
            <div className="min-w-[7rem] flex-1 rounded-xl border-[1.5px] border-brand bg-brand-soft px-3 py-2 text-center">
              <b className="block text-sm text-ink">{bold(s.label)}</b>
              {s.note && <span className="text-xs text-soft">{bold(s.note)}</span>}
            </div>
          </Fragment>
        ))}
      </div>
    </figure>
  );
}

export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {parse(text).map((b, i) =>
        b.kind === "text" ? <MiniMarkdown key={i} text={b.text} />
        : b.kind === "table" ? <ChatTable key={i} rows={b.rows} />
        : b.kind === "flow" ? <ChatFlow key={i} title={b.title} steps={b.steps} />
        : <pre key={i} className="overflow-x-auto rounded-xl bg-surface p-3 text-xs">{b.text}</pre>)}
    </div>
  );
}
