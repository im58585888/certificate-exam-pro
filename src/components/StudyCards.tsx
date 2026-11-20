import type { ReactNode } from "react";
import type { ConceptCard } from "@/lib/ai";
import { ArchFigure } from "./ArchDiagram";

function Label({ children }: { children: ReactNode }) {
  return <p className="mt-3 mb-1 text-[11px] font-bold tracking-wide text-muted uppercase">{children}</p>;
}

/** A small two-or-more column table with a tinted header, used for every part of the card. */
function Grid({ head, rows, widths }: { head: ReactNode[]; rows: ReactNode[][]; widths?: string[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full table-fixed text-left text-xs">
        <thead><tr>{head.map((h, i) => <th key={i} style={{ width: widths?.[i] }} className="border-b border-line bg-brand-soft px-2.5 py-1.5 font-bold text-ink">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-line last:border-0">{r.map((c, j) => <td key={j} className={`px-2.5 py-1.5 align-top ${j === 0 ? "text-ink" : "text-soft"}`}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/**
 * A concept card's teaching content as tables and a diagram rather than bullet lists. Shared by the study sheet and the
 * printable cheat sheet; `compact` keeps only the parts that fit a one-page sheet.
 */
export function ConceptCardBody({ card, compact = false }: { card: ConceptCard; compact?: boolean }) {
  return (
    <div className="text-sm">
      <p className="text-soft">{card.oneLiner}</p>

      {card.useWhen.length > 0 && (
        <>
          <Label>At a glance</Label>
          <Grid head={["✓ Use it when", "✗ Not when"]} rows={(compact ? card.useWhen.slice(0, 2) : card.useWhen).map((u) => [u.when, u.notWhen])} />
        </>
      )}

      {!compact && card.facts.length > 0 && (
        <>
          <Label>Key facts</Label>
          <Grid head={["Fact", "Detail"]} widths={["38%"]} rows={card.facts.map((f) => [f.label, f.value])} />
        </>
      )}

      {!compact && card.diagram && (
        <>
          <Label>How it fits</Label>
          <ArchFigure diagram={card.diagram} />
        </>
      )}

      {card.compare && card.compare.rows.length > 0 && (
        <>
          <Label>Compare</Label>
          <Grid head={card.compare.columns} rows={card.compare.rows} />
        </>
      )}

      {!compact && card.traps.length > 0 && (
        <>
          <Label>Exam traps</Label>
          <Grid head={["✗ Trap", "✓ Truth"]} widths={["50%"]} rows={card.traps.map((t) => [t.trap, t.truth])} />
        </>
      )}

      <p className="mt-3 rounded-lg bg-brand-soft px-3 py-1.5 font-semibold text-brand">Remember: {card.remember}</p>
    </div>
  );
}
