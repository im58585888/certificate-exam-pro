import type { ArchDiagram, ArchLink, ArchNode, ArchZone, NodeKind, ZoneKind } from "../arch";

// The public learning library: AWS service cheat sheets (/aws/[slug]), comparisons (/aws/compare/[slug]) and guides
// (/guides/[slug]). Content is written and fact-checked by hand, stored here as data, and rendered by one template per
// kind, so every page gets the same structure: a direct answer first, tables, a diagram, exam decision rules, sample
// questions from the bank, official references and a FAQ.

export type Category = "Compute" | "Storage" | "Database" | "Networking" | "Security" | "Integration" | "AI and ML";

export interface Section {
  id: string;
  heading: string;
  /** Opening sentence or two that answers the heading directly. */
  lead?: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
}

interface Base {
  slug: string;
  /** H1 on the page. */
  title: string;
  /** <title> tag, aimed at the main search phrase. */
  metaTitle: string;
  description: string;
  /** First published and last reviewed against AWS docs, YYYY-MM-DD. */
  published: string;
  reviewed: string;
  /** 40–70 word direct answer shown first; also what answer engines quote. */
  answer: string;
  sections: Section[];
  diagram?: ArchDiagram;
  /** "If the question says X, think Y" rules. */
  rules: string[];
  faq: [string, string][];
  /** Picks sample questions from the bank: text that should appear in the question, and ideally in its answer. */
  samples: { match: RegExp; topic?: RegExp; count?: number };
  references: { title: string; url: string }[];
  /** Slugs of related library pages (any kind), shown as links. */
  related: string[];
}

export interface ServiceSheet extends Base {
  kind: "service";
  service: string;
  category: Category;
  /** What each exam asks about this service. */
  exams: Partial<Record<"saa-c03" | "clf-c02" | "aif-c01", string>>;
}

export interface Comparison extends Base {
  kind: "compare";
  category: Category;
  /** The services being compared, for the hub and breadcrumbs. */
  items: string[];
  /** Side-by-side table: first column is the feature. */
  table: { head: string[]; rows: string[][] };
  /** "Pick X when…" lines, one per item. */
  pick: { item: string; when: string }[];
}

export interface Guide extends Base {
  kind: "guide";
  /** Exams this guide is about, for linking. */
  exams: ("saa-c03" | "clf-c02" | "aif-c01")[];
}

export type LibPage = ServiceSheet | Comparison | Guide;

// ---- Compact diagram authoring ----
type Z = [id: string, label: string, kind: ZoneKind, parent?: string];
type N = [id: string, label: string, kind: NodeKind, zone: string | null, role: string, note?: string];
type L = [from: string, to: string, label: string, explain: string];

/** Builds a diagram from tuples so content files stay readable. */
export function diagram(caption: string, zones: Z[], nodes: N[], links: L[]): ArchDiagram {
  return {
    caption,
    zones: zones.map(([id, label, kind, parent]): ArchZone => ({ id, label, kind, parent: parent ?? null })),
    nodes: nodes.map(([id, label, kind, zone, role, note]): ArchNode => ({ id, label, kind, zone, role, note: note ?? "", tag: "" })),
    links: links.map(([from, to, label, explain]): ArchLink => ({ from, to, label, explain, decision: false })),
  };
}
