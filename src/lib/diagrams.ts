import "server-only";
import { createHash } from "node:crypto";
import { cleanDiagram, type ArchDiagram } from "./arch";
import type { Question } from "./questions";
import aif from "./diagrams/aif-c01.json";
import clf from "./diagrams/clf-c02.json";
import saa from "./diagrams/saa-c03.json";

// "Picture the solution" diagrams, drawn once per question by scripts/gen-diagrams.mts. Each is tied to a hash of the
// question's text, so a question edited later (in the content files or by an admin override) stops showing a diagram
// that may no longer match it until the script is run again.

type Saved = Record<string, { hash: string; diagram: ArchDiagram | null }>;
const ALL: Saved = { ...(saa as Saved), ...(clf as Saved), ...(aif as Saved) };

/** Must match hashOf in scripts/gen-diagrams.mts. */
const hashOf = (q: Question) => createHash("sha256").update(JSON.stringify([q.stem, q.prompt, q.options.map((o) => [o.text, o.correct])])).digest("hex").slice(0, 16);

export function solutionDiagram(q: Question): ArchDiagram | null {
  const hit = ALL[q.id];
  return hit && hit.hash === hashOf(q) ? cleanDiagram(hit.diagram) : null;
}
