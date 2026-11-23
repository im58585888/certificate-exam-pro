import "server-only";
import { getExam } from "./exams";
import { questionsFor, type Question } from "./questions";

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

const cache = new Map<string, Set<string>>();
/** Ids of the public sample questions, for keeping them out of the free trial. */
export function sampleIds(slug: string): Set<string> {
  const key = `${slug}:${questionsFor(slug).length}`;
  let ids = cache.get(key);
  if (!ids) { ids = new Set(samplesFor(slug).map((q) => q.id)); cache.set(key, ids); }
  return ids;
}
