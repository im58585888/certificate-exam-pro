import type { ConceptCard } from "@/lib/ai";

/** A concept card's teaching content. Shared by the study sheet and the printable cheat sheet. */
export function ConceptCardBody({ card, compact = false }: { card: ConceptCard; compact?: boolean }) {
  const points = compact ? card.keyPoints.slice(0, 3) : card.keyPoints;
  return (
    <div className="text-sm">
      <p className="text-soft">{card.oneLiner}</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-4">{points.map((p, i) => <li key={i}>{p}</li>)}</ul>
      {card.compare && card.compare.rows.length > 0 && (
        <div className="mt-2.5 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead><tr>{card.compare.columns.map((c) => <th key={c} className="border-b border-line px-2 py-1.5 font-bold">{c}</th>)}</tr></thead>
            <tbody>{card.compare.rows.map((r, i) => <tr key={i} className="border-b border-line last:border-0">{r.map((c, j) => <td key={j} className="px-2 py-1.5 align-top text-soft">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {!compact && card.traps.length > 0 && (
        <div className="mt-2.5 rounded-lg bg-warn-soft px-3 py-2 text-warn">
          <b>Exam traps</b>
          <ul className="mt-0.5 list-disc pl-4">{card.traps.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      <p className="mt-2.5 rounded-lg bg-brand-soft px-3 py-1.5 font-semibold text-brand">Remember: {card.remember}</p>
    </div>
  );
}
