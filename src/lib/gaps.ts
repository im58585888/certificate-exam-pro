import "server-only";
import { servicesIn, type AwsService } from "./awsServices";
import type { SheetTopic } from "./studysheet";

// The study sheet's data: every open mistake (latest answer wrong) in a compact form, the learner's record per AWS
// service, and a word-matching grouping by service that stands in until (or if) Mia's own grouping arrives.

export interface GapMistake {
  id: string;
  topic: string;
  question: string;
  you: string;
  answer: string;
  remember: string;
  doc?: { title: string; url: string };
  /** Service for the word-matching fallback: the first one the scenario names, else the answer's, else the topic. */
  fallback: string;
}

export interface ServiceGroup {
  service: string;
  ids: string[];
}

export interface ServiceRecord {
  name: string;
  sheet?: string;
  /** Questions about this service answered right (latest answer). */
  right: number;
  /** Ids answered wrong (latest answer). */
  wrong: string[];
}

export interface StudyData {
  mistakes: GapMistake[];
  /** Keyed by service name. */
  records: Record<string, ServiceRecord>;
  fallbackGroups: ServiceGroup[];
}

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const answerOf = (q: { options: { text: string; correct: boolean }[] }) => q.options.filter((o) => o.correct).map((o) => o.text).join(" ");

/** Services a question is about, for the per-service record: the scenario's, plus the answer's. */
function servicesOf(q: { stem: string; prompt: string; options: { text: string; correct: boolean }[] }): AwsService[] {
  const all = [...servicesIn(`${q.stem} ${q.prompt}`), ...servicesIn(answerOf(q))];
  return all.filter((s, i) => all.findIndex((x) => x.id === s.id) === i);
}

export function studyData(topics: SheetTopic[]): StudyData {
  const records: Record<string, ServiceRecord> = {};
  const mistakes: GapMistake[] = [];
  for (const t of topics) {
    const results = new Map(t.results);
    for (const q of t.bank) {
      const ok = results.get(q.id);
      if (ok === undefined) continue;
      for (const s of servicesOf(q)) {
        const r = (records[s.name] ??= { name: s.name, sheet: s.sheet, right: 0, wrong: [] });
        if (ok) r.right++;
        else r.wrong.push(q.id);
      }
    }
    const byId = new Map(t.bank.map((q) => [q.id, q]));
    for (const m of t.mistakes) {
      const q = byId.get(m.questionId);
      if (!q) continue;
      const main = servicesIn(`${q.stem} ${q.prompt}`)[0] ?? servicesIn(answerOf(q))[0];
      mistakes.push({
        id: q.id,
        topic: t.topic,
        question: short(q.stem, 220),
        you: m.options.filter((o) => o.picked).map((o) => o.text).join("; ") || "No answer",
        answer: m.options.filter((o) => o.correct).map((o) => o.text).join("; "),
        remember: q.explanation.examTip,
        doc: q.explanation.references[0],
        fallback: main?.name ?? t.topic,
      });
    }
  }
  const groups = new Map<string, string[]>();
  for (const m of mistakes) groups.set(m.fallback, [...(groups.get(m.fallback) ?? []), m.id]);
  return {
    mistakes: mistakes.sort((a, b) => a.id.localeCompare(b.id)),
    records,
    fallbackGroups: [...groups.entries()].map(([service, ids]) => ({ service, ids }))
      .sort((a, b) => b.ids.length - a.ids.length || a.service.localeCompare(b.service)),
  };
}

/** Puts a service name Mia wrote into our canonical form when we know the service ("KMS" → "AWS KMS"). */
export function canonicalService(name: string): string {
  const found = servicesIn(name);
  return found.length === 1 ? found[0].name : name.trim();
}

export interface ResolvedPlan {
  summary: string;
  focus: { service: string; why: string }[];
  groups: ServiceGroup[];
  /** True when Mia wrote it; false for the word-matching stand-in. */
  byMia: boolean;
}

/**
 * Checks Mia's grouping against the real mistakes: names in one canonical form (same-named groups merged), each
 * mistake exactly once, unknown ids dropped, and any she missed put in their word-matching group.
 */
export function resolvePlan(plan: { summary: string; focus: { service: string; why: string }[]; groups: ServiceGroup[] } | null, data: StudyData): ResolvedPlan {
  const valid = new Set(data.mistakes.map((m) => m.id));
  const used = new Set<string>();
  const groups = new Map<string, string[]>();
  const add = (service: string, id: string) => {
    if (!valid.has(id) || used.has(id)) return;
    used.add(id);
    groups.set(service, [...(groups.get(service) ?? []), id]);
  };
  for (const g of plan?.groups ?? []) for (const id of g.ids) add(canonicalService(g.service), id);
  for (const m of data.mistakes) add(m.fallback, m.id);
  const list = [...groups.entries()].map(([service, ids]) => ({ service, ids }))
    .sort((a, b) => b.ids.length - a.ids.length || a.service.localeCompare(b.service));
  const names = new Set(list.map((g) => g.service));
  const focus = (plan?.focus ?? []).map((f) => ({ service: canonicalService(f.service), why: f.why })).filter((f) => names.has(f.service)).slice(0, 3);
  return {
    summary: plan?.summary ?? "",
    focus: focus.length ? focus : list.slice(0, 3).map((g) => ({ service: g.service, why: "" })),
    groups: list,
    byMia: !!plan,
  };
}
