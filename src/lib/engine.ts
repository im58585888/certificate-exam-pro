import "server-only";
import { query } from "./db";
import { ownerClause, type Owner } from "./auth";
import { areaOf } from "./areas";
import { getExam, type DomainId } from "./exams";
import type { FlagRow } from "./flags";
import { questionsFor, type Question } from "./questions";
import { sampleIds } from "./samples";

const withoutSamples = (bank: Question[], exam: string) => {
  const ids = sampleIds(exam);
  return bank.filter((q) => !ids.has(q.id));
};

export type Mode = "trial" | "practice" | "reinforce" | "review" | "flagged" | "exam";

export interface AttemptRow {
  question_id: string;
  correct: boolean;
  time_ms: number | null;
  created_at: Date;
  session_id: string;
}

export async function attemptsFor(owner: Owner, exam: string): Promise<AttemptRow[]> {
  const [clause, param] = ownerClause(owner, 2);
  return query<AttemptRow>(
    `select question_id, correct, time_ms, created_at, session_id from attempts where exam = $1 and ${clause} order by created_at`,
    [exam, param],
  );
}

/** Distinct questions answered: the unit the free trial is measured in. */
export async function answeredCount(owner: Owner, exam: string): Promise<number> {
  const [clause, param] = ownerClause(owner, 2);
  const rows = await query<{ n: number }>(
    `select count(distinct question_id)::int as n from attempts where exam = $1 and ${clause}`,
    [exam, param],
  );
  return rows[0]?.n ?? 0;
}

// ---------- Spaced repetition (Leitner boxes derived from attempt history) ----------

const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
const GRADUATED_BOX = REVIEW_INTERVAL_DAYS.length;

export interface ReviewItem {
  questionId: string;
  box: number;
  dueAt: Date;
  misses: number;
  lastWrong: Date;
  flagged: boolean;
}

/**
 * A question enters the review queue the first time it is missed. Each later correct answer moves it
 * up a box (1 → 3 → 7 → 14 → 30 days); a miss sends it back to box 1. After box 5 it graduates.
 * Flagging counts like a miss at the moment of flagging, and a flagged question never graduates
 * while the flag is on (it stays at the longest interval instead).
 */
export function reviewQueue(attempts: AttemptRow[], flags: FlagRow[] = []): ReviewItem[] {
  type Event = { t: Date; correct: boolean; flag?: boolean };
  const byQ = new Map<string, Event[]>();
  const push = (id: string, e: Event) => byQ.set(id, [...(byQ.get(id) ?? []), e]);
  for (const a of attempts) push(a.question_id, { t: new Date(a.created_at), correct: a.correct });
  const flagged = new Set<string>();
  for (const f of flags) { flagged.add(f.question_id); push(f.question_id, { t: new Date(f.created_at), correct: false, flag: true }); }
  const items: ReviewItem[] = [];
  for (const [questionId, events] of byQ) {
    events.sort((a, b) => a.t.getTime() - b.t.getTime());
    const isFlagged = flagged.has(questionId);
    let box = 0, misses = 0, dueAt = new Date(0), lastWrong: Date | null = null;
    for (const e of events) {
      if (!e.correct) {
        box = 1; lastWrong = e.t;
        if (!e.flag) misses++;
      } else if (box > 0) {
        box = isFlagged ? Math.min(box + 1, GRADUATED_BOX - 1) : box + 1;
      }
      // A flag set after answering makes the question due now; answers schedule the next review.
      dueAt = e.flag ? e.t : new Date(e.t.getTime() + REVIEW_INTERVAL_DAYS[Math.min(box, GRADUATED_BOX - 1)] * 86400000);
    }
    if (box > 0 && box < GRADUATED_BOX && lastWrong) items.push({ questionId, box, dueAt, misses, lastWrong, flagged: isFlagged });
  }
  return items.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

export function dueCount(queue: ReviewItem[], now = Date.now()): number {
  return queue.filter((r) => r.dueAt.getTime() <= now).length;
}

// ---------- Mastery ----------

export interface Mastery {
  key: string;
  label: string;
  domain: DomainId;
  attempts: number;
  correct: number;
  /** 0..1, recency-weighted accuracy shrunk toward 50% while evidence is thin. */
  score: number;
}

const RECENCY = 0.85; // each older answer counts 15% less than the next newer one
const PRIOR_WEIGHT = 2; // pseudo-answers at 50% so one lucky guess doesn't read as mastery

function masteryOf(rows: AttemptRow[]): { score: number; correct: number } {
  let w = 1, num = 0, den = 0, correct = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].correct) correct++;
    num += w * (rows[i].correct ? 1 : 0);
    den += w;
    w *= RECENCY;
  }
  return { score: (num + 0.5 * PRIOR_WEIGHT) / (den + PRIOR_WEIGHT), correct };
}

export function masteryBy(attempts: AttemptRow[], bank: Question[], by: "topic" | "domain"): Mastery[] {
  const qById = new Map(bank.map((q) => [q.id, q]));
  const groups = new Map<string, { domain: DomainId; rows: AttemptRow[] }>();
  for (const a of attempts) {
    const q = qById.get(a.question_id);
    if (!q) continue;
    const key = by === "topic" ? q.topic : q.domain;
    const g = groups.get(key) ?? { domain: q.domain, rows: [] };
    g.rows.push(a);
    groups.set(key, g);
  }
  return [...groups].map(([key, g]) => ({ key, label: key, domain: g.domain, attempts: g.rows.length, ...masteryOf(g.rows) }));
}

/**
 * Readiness: exam-weighted domain mastery, with unattempted domains counted at 35% so skipping a
 * domain can't inflate the estimate. Mapped linearly onto the 100–1000 scaled range (for example 720 = pass on SAA-C03).
 * This is a study signal, not a prediction of the official score.
 */
export function readiness(attempts: AttemptRow[], examSlug: string) {
  const exam = getExam(examSlug)!;
  const dm = new Map(masteryBy(attempts, questionsFor(examSlug), "domain").map((m) => [m.key, m]));
  const r = exam.domains.reduce((s, d) => s + d.weight * (dm.get(d.id)?.score ?? 0.35), 0);
  return { ratio: r, scaled: Math.round(100 + 900 * r), confident: attempts.length >= 30 };
}

/** Topics ordered weakest first: flagged topics lead (most flags first), then lowest mastery. */
export function weakestTopics(attempts: AttemptRow[], bank: Question[], flags: FlagRow[] = []): string[] {
  const topicOf = new Map(bank.map((q) => [q.id, q.topic]));
  const flagCount = new Map<string, number>();
  for (const f of flags) {
    const t = topicOf.get(f.question_id);
    if (t) flagCount.set(t, (flagCount.get(t) ?? 0) + 1);
  }
  const mastery = new Map(masteryBy(attempts, bank, "topic").map((m) => [m.key, m.score]));
  const topics = [...new Set([...flagCount.keys(), ...mastery.keys()])];
  return topics.sort((a, b) => (flagCount.get(b) ?? 0) - (flagCount.get(a) ?? 0) || (mastery.get(a) ?? 0.5) - (mastery.get(b) ?? 0.5));
}

// ---------- Question selection ----------

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Unseen questions first (shuffled), then least-recently-seen. */
function freshestFirst(pool: Question[], lastSeen: Map<string, number>): Question[] {
  const unseen = shuffle(pool.filter((q) => !lastSeen.has(q.id)));
  const seen = pool.filter((q) => lastSeen.has(q.id)).sort((a, b) => lastSeen.get(a.id)! - lastSeen.get(b.id)!);
  return [...unseen, ...seen];
}

/**
 * Picks from each domain in proportion to exam weights, so short sets still mirror the real blueprint.
 * With a narrowed scope, the weights are rescaled over the domains that are present.
 */
function blueprintPick(pool: Question[], n: number, examSlug: string, lastSeen: Map<string, number>): Question[] {
  const exam = getExam(examSlug)!;
  const present = exam.domains.filter((d) => pool.some((q) => q.domain === d.id));
  const totalWeight = present.reduce((s, d) => s + d.weight, 0);
  const out: Question[] = [];
  for (const d of present) {
    const k = Math.round((n * d.weight) / totalWeight);
    out.push(...freshestFirst(pool.filter((q) => q.domain === d.id), lastSeen).slice(0, k));
  }
  const used = new Set(out.map((q) => q.id));
  out.push(...freshestFirst(pool.filter((q) => !used.has(q.id)), lastSeen).slice(0, Math.max(0, n - out.length)));
  return shuffle(out.slice(0, n));
}

/** Which part of the bank a session draws from. Empty lists mean "all". */
export interface Scope {
  domains: DomainId[];
  areas: string[];
  /** Optional difficulty filter for practice sets. */
  difficulty?: Question["difficulty"];
}

export const FULL_SCOPE: Scope = { domains: [], areas: [] };

export function inScope(q: Question, scope: Scope, exam: string): boolean {
  return (!scope.domains.length || scope.domains.includes(q.domain)) && (!scope.areas.length || scope.areas.includes(areaOf(exam, q.topic)))
    && (!scope.difficulty || q.difficulty === scope.difficulty);
}

export interface SelectOptions {
  exam: string;
  mode: Mode;
  count: number;
  scope?: Scope;
  attempts: AttemptRow[];
  flags?: FlagRow[];
}

export function selectQuestions({ exam, mode, count, scope = FULL_SCOPE, attempts, flags = [] }: SelectOptions): Question[] {
  const bank = questionsFor(exam);
  const lastSeen = new Map<string, number>();
  for (const a of attempts) lastSeen.set(a.question_id, new Date(a.created_at).getTime());
  // The mock exam always uses the whole bank, like the real test.
  // The free trial skips the sample questions already public on the exam guide.
  const pool = mode === "exam" ? bank : mode === "trial" ? withoutSamples(bank, exam) : bank.filter((q) => inScope(q, scope, exam));

  if (mode === "trial" || mode === "exam" || mode === "practice") return blueprintPick(pool, count, exam, lastSeen);

  const byId = new Map(pool.map((q) => [q.id, q]));
  const queue = reviewQueue(attempts, flags);
  if (mode === "review") {
    // Due items first, then the rest of the queue (earliest due first).
    return queue.map((r) => byId.get(r.questionId)).filter((q) => !!q).slice(0, count);
  }
  if (mode === "flagged") {
    // Longest-unseen flagged questions first.
    const flaggedQs = flags.map((f) => byId.get(f.question_id)).filter((q) => !!q);
    return flaggedQs.sort((a, b) => (lastSeen.get(a.id) ?? 0) - (lastSeen.get(b.id) ?? 0)).slice(0, count);
  }

  // reinforce: ~40% due mistakes, ~40% weakest topics (new questions preferred), ~20% fresh mixed.
  const now = Date.now();
  const picked = new Map<string, Question>();
  const add = (qs: Question[], limit: number) => {
    for (const q of qs) {
      if (picked.size >= limit) break;
      picked.set(q.id, q);
    }
  };
  add(queue.filter((r) => r.dueAt.getTime() <= now).map((r) => byId.get(r.questionId)).filter((q) => !!q), Math.round(count * 0.4));
  const weakTopics = weakestTopics(attempts, pool, flags).slice(0, 4);
  add(freshestFirst(pool.filter((q) => weakTopics.includes(q.topic) && !picked.has(q.id)), lastSeen), Math.round(count * 0.8));
  add(freshestFirst(pool.filter((q) => !picked.has(q.id)), lastSeen), count);
  return shuffle([...picked.values()]);
}

// ---------- Readiness check (first-attempt based) ----------

export type CheckState = "pass" | "fail" | "unknown";
export interface ReadinessCheck {
  verdict: "ready" | "close" | "not-yet" | "too-early";
  firstAttempts: number;
  firstAcc: number | null;
  repeatAcc: number | null;
  /** Points by which repeat-attempt accuracy beats first-attempt accuracy (a memorization signal). */
  gap: number | null;
  weakestDomain: { id: string; name: string; acc: number } | null;
  checks: { key: string; label: string; state: CheckState; detail: string }[];
}

/**
 * Judges readiness on questions answered for the first time, because scores on repeated questions measure memory.
 * Four checks: first-attempt accuracy ≥ 80%, every domain ≥ 70% on first attempts, a recent timed mock exam ≥ 80%,
 * and pace within the real exam's time per question. A study signal, never a pass guarantee.
 */
export function readinessCheck(
  attempts: AttemptRow[],
  examSlug: string,
  lastMock: { correct: number; total: number; at: Date } | null,
  now = Date.now(),
): ReadinessCheck {
  const exam = getExam(examSlug)!;
  const domainOf = new Map(questionsFor(examSlug).map((q) => [q.id, q.domain]));
  const firstSeen = new Set<string>();
  const first: AttemptRow[] = [];
  const repeat: AttemptRow[] = [];
  for (const a of attempts) {
    if (firstSeen.has(a.question_id)) repeat.push(a);
    else { firstSeen.add(a.question_id); first.push(a); }
  }
  const acc = (rows: AttemptRow[]) => (rows.length ? rows.filter((r) => r.correct).length / rows.length : null);
  const firstAcc = acc(first);
  const repeatAcc = repeat.length >= 10 ? acc(repeat) : null;
  const gap = firstAcc !== null && repeatAcc !== null ? Math.round((repeatAcc - firstAcc) * 100) : null;

  const byDomain = exam.domains.map((d) => {
    const rows = first.filter((a) => domainOf.get(a.question_id) === d.id);
    return { id: d.id, name: d.name, n: rows.length, acc: acc(rows) };
  });
  const measured = byDomain.filter((d) => d.n >= 5 && d.acc !== null) as { id: string; name: string; n: number; acc: number }[];
  const weakest = measured.length ? measured.reduce((a, b) => (b.acc < a.acc ? b : a)) : null;

  const timed = attempts.filter((a) => a.time_ms);
  const avgSec = timed.length >= 10 ? timed.reduce((s, a) => s + a.time_ms!, 0) / timed.length / 1000 : null;
  const allowed = (exam.examMinutes * 60) / exam.examQuestions;
  const mockPct = lastMock && lastMock.total ? lastMock.correct / lastMock.total : null;
  const mockRecent = lastMock ? now - lastMock.at.getTime() < 14 * 86400000 : false;
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  const checks: ReadinessCheck["checks"] = [
    {
      key: "first", label: "80%+ on questions you're seeing for the first time",
      state: first.length < 40 ? "unknown" : firstAcc! >= 0.8 ? "pass" : "fail",
      detail: first.length < 40 ? `${first.length} first attempts so far; 40 needed for a fair read.` : `${pct(firstAcc!)} across ${first.length} first attempts.`,
    },
    {
      key: "domains", label: "No exam domain below 70%",
      state: measured.length < exam.domains.length ? "unknown" : measured.every((d) => d.acc >= 0.7) ? "pass" : "fail",
      detail: measured.length < exam.domains.length
        ? `Answer at least 5 new questions in every domain (${measured.length} of ${exam.domains.length} done).`
        : weakest ? `Weakest: ${weakest.name} at ${pct(weakest.acc)} on first attempts.` : "",
    },
    {
      key: "mock", label: "A timed mock exam at 80%+ in the last 2 weeks",
      state: !lastMock || !mockRecent ? "unknown" : mockPct! >= 0.8 ? "pass" : "fail",
      detail: !lastMock ? `Take a full ${exam.examQuestions}-question timed mock exam.` : !mockRecent ? "Your last mock exam is more than 2 weeks old; take a fresh one." : `Last mock exam: ${pct(mockPct!)}.`,
    },
    {
      key: "pace", label: `Pace within ${Math.round(allowed)}s per question`,
      state: avgSec === null ? "unknown" : avgSec <= allowed ? "pass" : "fail",
      detail: avgSec === null ? "Not enough timed answers yet." : `You average ${Math.round(avgSec)}s per question.`,
    },
  ];
  const passes = checks.filter((c) => c.state === "pass").length;
  const unknowns = checks.filter((c) => c.state === "unknown").length;
  const verdict: ReadinessCheck["verdict"] = first.length < 20 ? "too-early" : passes === 4 ? "ready" : passes >= 2 && unknowns <= 1 ? "close" : "not-yet";
  return { verdict, firstAttempts: first.length, firstAcc, repeatAcc, gap, weakestDomain: weakest ? { id: weakest.id, name: weakest.name, acc: weakest.acc } : null, checks };
}
