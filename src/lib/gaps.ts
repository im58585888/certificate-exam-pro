import "server-only";
import { COMPARE_PAIRS, servicesIn, type AwsService } from "./awsServices";
import type { SheetTopic } from "./studysheet";

// The study sheet's "Your gaps" panel: which AWS services to deep dive, which ones the learner mixes up, and the core
// concepts behind their open mistakes. Built from the study sheet's own data (latest answer per question), no AI.

export interface ServiceGap {
  id: string;
  name: string;
  /** Open mistakes where this service is (part of) the right answer, or the subject when the answer names none. */
  missed: number;
  /** Latest answers on questions about this service: right / total. */
  right: number;
  total: number;
  sheet?: string;
  doc?: { title: string; url: string };
  topics: string[];
}

export interface MixUp {
  picked: string;
  answer: string;
  count: number;
  compare?: string;
}

export interface ConceptGap {
  topic: string;
  missed: number;
  concepts: string[];
}

export interface GapReport {
  services: ServiceGap[];
  mixups: MixUp[];
  concepts: ConceptGap[];
  /** Open mistake ids, so a saved AI diagnosis can tell when it's out of date. */
  mistakeIds: string[];
}

const answerText = (opts: { text: string; correct: boolean }[]) => opts.filter((o) => o.correct).map((o) => o.text).join(" ");

/** Services a question is about: the ones its right answer names, else the ones its scenario names. */
function subjectOf(q: { stem: string; prompt: string; options: { text: string; correct: boolean }[] }): AwsService[] {
  const inAnswer = servicesIn(answerText(q.options));
  return inAnswer.length ? inAnswer : servicesIn(`${q.stem} ${q.prompt}`);
}

export function gapReport(topics: SheetTopic[]): GapReport {
  const answered = new Map(topics.flatMap((t) => t.results));
  const svc = new Map<string, ServiceGap>();
  const touch = (s: AwsService) => {
    const g = svc.get(s.id) ?? { id: s.id, name: s.name, missed: 0, right: 0, total: 0, sheet: s.sheet, topics: [] };
    svc.set(s.id, g);
    return g;
  };

  // Accuracy per service over every question answered (latest answer).
  for (const t of topics) {
    for (const q of t.bank) {
      const ok = answered.get(q.id);
      if (ok === undefined) continue;
      for (const s of subjectOf(q)) {
        const g = touch(s);
        g.total++;
        if (ok) g.right++;
      }
    }
  }

  const mix = new Map<string, MixUp>();
  const concepts: ConceptGap[] = [];
  const mistakeIds: string[] = [];
  for (const t of topics) {
    if (!t.mistakes.length) continue;
    const byId = new Map(t.bank.map((q) => [q.id, q]));
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const m of t.mistakes) {
      mistakeIds.push(m.questionId);
      const q = byId.get(m.questionId);
      for (const s of subjectOf(m)) {
        const g = touch(s);
        g.missed++;
        if (!g.topics.includes(t.topic)) g.topics.push(t.topic);
        const ref = q?.explanation.references[0];
        if (!g.doc && ref) g.doc = ref;
      }
      // Mix-ups: the main service (first one named) in a wrong option the learner picked, versus the right answer's
      // main service. Services both options name aren't the difference, so they're skipped.
      const rightAll = m.options.filter((o) => o.correct).flatMap((o) => servicesIn(o.text));
      const rightIds = new Set(rightAll.map((s) => s.id));
      for (const o of m.options.filter((x) => x.picked && !x.correct)) {
        const pickedAll = servicesIn(o.text);
        const p = pickedAll.find((s) => !rightIds.has(s.id));
        const a = rightAll.find((s) => !pickedAll.some((x) => x.id === s.id));
        if (p && a) {
          const key = `${p.id}>${a.id}`;
          const x = mix.get(key) ?? { picked: p.name, answer: a.name, count: 0, compare: COMPARE_PAIRS.find((c) => c.ids.includes(p.id) && c.ids.includes(a.id))?.slug };
          x.count++;
          mix.set(key, x);
        }
      }
      const c = q?.explanation.concept;
      if (c && !seen.has(c)) { seen.add(c); lines.push(c); }
    }
    concepts.push({ topic: t.topic, missed: t.mistakes.length, concepts: lines.slice(0, 2) });
  }

  return {
    services: [...svc.values()].filter((g) => g.missed > 0)
      .sort((a, b) => b.missed - a.missed || a.right / a.total - b.right / b.total || a.name.localeCompare(b.name)).slice(0, 8),
    mixups: [...mix.values()].sort((a, b) => b.count - a.count || a.picked.localeCompare(b.picked)).slice(0, 6),
    concepts: concepts.sort((a, b) => b.missed - a.missed || a.topic.localeCompare(b.topic)).slice(0, 6),
    mistakeIds: mistakeIds.sort(),
  };
}
