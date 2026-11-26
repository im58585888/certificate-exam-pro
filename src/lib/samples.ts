import "server-only";
import { getExam } from "./exams";
import { LIBRARY, type LibPage } from "./library";
import { examOf, questionsFor, type Question } from "./questions";

// The free sample questions shown on each public exam guide (/exams/[exam]). They're readable by anyone, including
// search engines, so the free trial skips them to keep the trial fresh.

export const SAMPLE_COUNT = 10;

/** A fixed, spread-out set: domains in proportion to their exam weight, single-answer, varied topics. */
export function samplesFor(slug: string, count = SAMPLE_COUNT): Question[] {
  const exam = getExam(slug);
  if (!exam) return [];
  const bank = questionsFor(slug).filter((q) => q.type === "single" && q.difficulty !== "hard").sort((a, b) => a.id.localeCompare(b.id));
  // Seats per domain by weight, topping up the heaviest domains until the total is right.
  const seats = exam.domains.map((d) => ({ id: d.id, n: Math.max(1, Math.floor(d.weight * count)), w: d.weight }));
  for (const s of [...seats].sort((a, b) => b.w - a.w)) {
    if (seats.reduce((t, x) => t + x.n, 0) >= count) break;
    s.n++;
  }
  const picked: Question[] = [];
  for (const s of seats) {
    const pool = bank.filter((q) => q.domain === s.id);
    const topics = new Set<string>();
    // Walk the pool in even steps so the picks come from across the domain, one per topic where possible.
    const step = Math.max(1, Math.floor(pool.length / (s.n * 2)));
    for (let i = 0; i < pool.length && topics.size < s.n; i += step) {
      if (!topics.has(pool[i].topic)) { topics.add(pool[i].topic); picked.push(pool[i]); }
    }
  }
  return picked.slice(0, count);
}

/** Questions on the public free-questions page for an exam (/exams/[exam]/free-questions). */
export const FREE_PAGE_COUNT = 20;
export const freePageSamples = (slug: string) => samplesFor(slug, FREE_PAGE_COUNT);

/**
 * Sample questions for a library page: questions that mention the page's service, preferring ones where it's in the
 * correct answer, spread across exams. Deterministic, so the page doesn't change between builds.
 */
export function librarySamples(page: LibPage): (Question & { exam: string })[] {
  const count = page.samples.count ?? 3;
  if (!count) return [];
  const re = page.samples.match;
  const byExam = new Map<string, { q: Question; score: number }[]>();
  for (const slug of ["saa-c03", "clf-c02", "aif-c01"]) {
    const scored = questionsFor(slug)
      .map((q) => {
        const answer = q.options.filter((o) => o.correct).map((o) => o.text).join(" ");
        const score = (page.samples.topic?.test(q.topic) ? 3 : 0) + (re.test(answer) ? 2 : 0) + (re.test(`${q.stem} ${q.prompt}`) ? 1 : 0);
        return { q, score };
      })
      // On topic and mentioning the service, or the service is in the answer and the scenario.
      .filter((x) => x.score >= 3 && (re.test(x.q.options.filter((o) => o.correct).map((o) => o.text).join(" ")) || re.test(`${x.q.stem} ${x.q.prompt}`)))
      .sort((a, b) => b.score - a.score || a.q.id.localeCompare(b.q.id));
    if (scored.length) byExam.set(slug, scored);
  }
  const picked: (Question & { exam: string })[] = [];
  for (let round = 0; picked.length < count && round < 10; round++) {
    for (const [slug, list] of byExam) {
      // Step through each exam's list so picks come from different topics, not one cluster of ids.
      const item = list[Math.floor((round * list.length) / 4)];
      if (item && picked.length < count && !picked.some((p) => p.id === item.q.id)) picked.push({ ...item.q, exam: slug });
    }
  }
  return picked;
}

const cache = new Map<string, Set<string>>();
/** Ids of every publicly shown question for an exam (guides, free-questions page, library), kept out of the free trial. */
export function sampleIds(slug: string): Set<string> {
  const key = `${slug}:${questionsFor(slug).length}`;
  let ids = cache.get(key);
  if (!ids) {
    ids = new Set([...samplesFor(slug), ...freePageSamples(slug)].map((q) => q.id));
    for (const page of LIBRARY) for (const q of librarySamples(page)) if ((examOf(q.id) ?? q.exam) === slug) ids.add(q.id);
    cache.set(key, ids);
  }
  return ids;
}
