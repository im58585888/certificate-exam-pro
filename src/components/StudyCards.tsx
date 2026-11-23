import type { ReactNode } from "react";
import type { ConceptCard } from "@/lib/ai";
import { ArchFigure } from "./ArchDiagram";

function Label({ children }: { children: ReactNode }) {
  return <p className="mt-3 mb-1 text-[11px] font-bold tracking-wide text-muted uppercase">{children}</p>;
}

/**
 * A topic's lesson: what it is, why it's useful, and an architecture diagram when the topic is a setup. Shared by the study
 * sheet and the printable cheat sheet; `compact` (the cheat sheet) leaves out the diagram so cards fit a printed page.
 */
export function ConceptCardBody({ card, compact = false }: { card: ConceptCard; compact?: boolean }) {
  return (
    <div className="text-sm">
      <Label>What is it?</Label>
      <p className="leading-relaxed text-ink">{card.whatItIs}</p>

      {card.whyUseful.length > 0 && (
        <>
          <Label>Why is it useful?</Label>
          <ul className="list-disc space-y-1 pl-5 leading-relaxed text-soft">
            {card.whyUseful.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </>
      )}

      {!compact && card.diagram && (
        <>
          <Label>How it fits</Label>
          <ArchFigure diagram={card.diagram} />
        </>
      )}
    </div>
  );
}
