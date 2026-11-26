import "server-only";
import { hrefOf, labelOf, LIBRARY } from "./library";
import type { Question } from "./questions";

// "Deep dive these topics" on the results page: the topics a learner missed, most missed first, each with our matching
// cheat sheet or comparison and the AWS docs the missed questions cite.

export interface DeepDiveTopic {
  topic: string;
  missed: number;
  pages: { href: string; label: string; kind: "service" | "compare" }[];
  docs: { title: string; url: string }[];
}

const PAGES = LIBRARY.filter((p) => p.kind !== "guide");

/** Library pages about this question: same scoring the cheat sheets use to pick their sample questions. */
function pagesFor(q: Question) {
  const answer = q.options.filter((o) => o.correct).map((o) => o.text).join(" ");
  const scenario = `${q.stem} ${q.prompt}`;
  return PAGES
    .map((p) => {
      const re = p.samples.match;
      // A topic match counts on its own here (a question tagged "S3 Security" may never write "S3").
      const score = (p.samples.topic?.test(q.topic) ? 3 : 0) + (re.test(answer) ? 2 : 0) + (re.test(scenario) ? 1 : 0);
      return { p, score };
    })
    .filter((x) => x.score >= 3);
}

export function deepDive(missed: Question[], max = 5): DeepDiveTopic[] {
  const byTopic = new Map<string, { qs: Question[]; pages: Map<string, { page: (typeof PAGES)[number]; score: number }> }>();
  for (const q of missed) {
    const t = byTopic.get(q.topic) ?? { qs: [] as Question[], pages: new Map() };
    t.qs.push(q);
    for (const { p, score } of pagesFor(q)) {
      const prev = t.pages.get(p.slug);
      t.pages.set(p.slug, { page: p, score: (prev?.score ?? 0) + score });
    }
    byTopic.set(q.topic, t);
  }
  return [...byTopic.entries()]
    .sort((a, b) => b[1].qs.length - a[1].qs.length || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([topic, t]) => {
      const docs = new Map<string, { title: string; url: string }>();
      for (const q of t.qs) for (const r of q.explanation.references) if (!docs.has(r.url)) docs.set(r.url, r);
      return {
        topic,
        missed: t.qs.length,
        pages: [...t.pages.values()].sort((a, b) => b.score - a.score).slice(0, 2)
          .map(({ page }) => ({ href: hrefOf(page), label: labelOf(page), kind: page.kind as "service" | "compare" })),
        docs: [...docs.values()].slice(0, 2),
      };
    });
}
