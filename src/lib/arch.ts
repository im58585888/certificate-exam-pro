// The breakdown's architecture diagram ("Picture the scenario"): boundaries (on-premises, Region, VPC, subnets) that
// hold components, arrows between components, and the piece the question asks the learner to choose, drawn as a "?".
// Shared by the server (which checks what the model wrote) and the browser (which draws it).

export const ZONE_KINDS = ["onprem", "cloud", "region", "account", "vpc", "public", "private", "other"] as const;
export const NODE_KINDS = ["users", "compute", "storage", "database", "network", "security", "integration", "analytics", "other", "decision"] as const;

export type ZoneKind = (typeof ZONE_KINDS)[number];
export type NodeKind = (typeof NODE_KINDS)[number];

export interface ArchZone { id: string; label: string; kind: ZoneKind; parent: string | null }
/** role: what this piece does in this setup (shown under the diagram). Older saved diagrams don't have it. */
export interface ArchNode { id: string; label: string; note: string; kind: NodeKind; zone: string | null; tag: string; role?: string }
/** explain: how this step works, shown as a numbered step under the diagram. Older saved diagrams don't have it. */
export interface ArchLink { from: string; to: string; label: string; decision: boolean; explain?: string }
export interface ArchDiagram { caption: string; zones: ArchZone[]; nodes: ArchNode[]; links: ArchLink[] }

const LIMITS = { nodes: 9, zones: 6, links: 10, depth: 3 };
const short = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

/**
 * Makes a diagram safe to draw: drops broken references, caps its size and nesting, and returns null when there's too
 * little left to be worth a picture.
 */
export function cleanDiagram(d: ArchDiagram | null | undefined): ArchDiagram | null {
  if (!d || !Array.isArray(d.nodes)) return null;
  const zones = (Array.isArray(d.zones) ? d.zones : []).slice(0, LIMITS.zones)
    .map((z) => ({ id: short(z.id, 40), label: short(z.label, 40), kind: (ZONE_KINDS as readonly string[]).includes(z.kind) ? z.kind : "other", parent: z.parent ? short(z.parent, 40) : null }))
    .filter((z, i, all) => z.id && z.label && all.findIndex((o) => o.id === z.id) === i);
  const zoneIds = new Set(zones.map((z) => z.id));
  for (const z of zones) if (z.parent && (!zoneIds.has(z.parent) || z.parent === z.id)) z.parent = null;
  // Break parent loops and flatten anything nested deeper than LIMITS.depth.
  const byId = new Map(zones.map((z) => [z.id, z]));
  for (const z of zones) {
    const seen = new Set([z.id]);
    let p = z.parent, depth = 1;
    while (p) {
      if (seen.has(p) || ++depth > LIMITS.depth) { z.parent = null; break; }
      seen.add(p);
      p = byId.get(p)?.parent ?? null;
    }
  }
  const nodes = d.nodes.slice(0, LIMITS.nodes)
    .map((n) => ({
      id: short(n.id, 40), label: short(n.label, 40), note: short(n.note, 50), tag: short(n.tag, 40), role: short(n.role, 300),
      kind: (NODE_KINDS as readonly string[]).includes(n.kind) ? n.kind : "other",
      zone: n.zone && zoneIds.has(n.zone) ? n.zone : null,
    }))
    .filter((n, i, all) => n.id && n.label && all.findIndex((o) => o.id === n.id) === i);
  if (nodes.length < 2) return null;
  const nodeIds = new Set(nodes.map((n) => n.id));
  const links = (Array.isArray(d.links) ? d.links : [])
    .map((l) => ({ from: short(l.from, 40), to: short(l.to, 40), label: short(l.label, 50), decision: !!l.decision, explain: short(l.explain, 900) }))
    .filter((l) => nodeIds.has(l.from) && nodeIds.has(l.to) && l.from !== l.to)
    .slice(0, LIMITS.links);
  // Keep only boundaries that end up holding something.
  const used = new Set<string>();
  for (const n of nodes) for (let z = n.zone; z && !used.has(z); z = byId.get(z)?.parent ?? null) used.add(z);
  return { caption: short(d.caption, 160), zones: zones.filter((z) => used.has(z.id)), nodes, links };
}

/** Saved to the study sheet as a fenced block the chat renderer knows how to draw. */
export const archMarkdown = (d: ArchDiagram) => ["```arch", JSON.stringify(d), "```"].join("\n");
