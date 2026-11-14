import "server-only";
import aifC01 from "../../content/aif-c01";
import clfC02 from "../../content/clf-c02";
import saaC03 from "../../content/saa-c03";
import { query } from "./db";
import type { DomainId } from "./exams";

export interface Option {
  key: string;
  text: string;
  correct: boolean;
  why: string;
}

export interface Question {
  id: string;
  domain: DomainId;
  topic: string;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  type: "single" | "multi";
  selectCount?: number;
  stem: string;
  prompt: string;
  options: Option[];
  explanation: {
    answer: string;
    concept: string;
    examTip: string;
    references: { title: string; url: string }[];
  };
}

/** What the browser receives before answering: no correctness, no explanations. */
export interface PublicQuestion {
  id: string;
  domain: DomainId;
  topic: string;
  difficulty: Question["difficulty"];
  type: Question["type"];
  selectCount: number;
  stem: string;
  prompt: string;
  options: { key: string; text: string }[];
}

/** What the browser receives after grading. */
export interface Feedback {
  correct: boolean;
  picks: string[];
  correctKeys: string[];
  options: { key: string; why: string }[];
  explanation: Question["explanation"];
}

const BANK: Record<string, Question[]> = {
  "saa-c03": saaC03 as Question[],
  "aif-c01": aifC01 as Question[],
  "clf-c02": clfC02 as Question[],
};
const BY_ID = new Map(Object.values(BANK).flat().map((q) => [q.id, q]));
const EXAM_OF = new Map(Object.entries(BANK).flatMap(([exam, qs]) => qs.map((q) => [q.id, exam] as const)));

// ---------- Admin overrides (edits, new questions, disabled questions) stored in the database ----------

interface Override {
  exam: string;
  data: Question | null;
  disabled: boolean;
}

const OVERRIDE_TTL_MS = 30_000;
const g = globalThis as unknown as { __cepOverrides?: { map: Map<string, Override>; at: number } };

/** Refreshes the override cache. Call at the start of any server entry point that reads questions. */
export async function ensureBank(force = false): Promise<void> {
  if (!force && g.__cepOverrides && Date.now() - g.__cepOverrides.at < OVERRIDE_TTL_MS) return;
  const rows = await query<{ question_id: string; exam: string; data: Question | null; disabled: boolean }>(
    `select question_id, exam, data, disabled from question_overrides`,
  );
  g.__cepOverrides = { map: new Map(rows.map((r) => [r.question_id, { exam: r.exam, data: r.data, disabled: r.disabled }])), at: Date.now() };
}

const overrides = () => g.__cepOverrides?.map ?? new Map<string, Override>();

/** Built-in question with any admin edit applied (including disabled ones, so historical attempts still render). */
export function getQuestion(id: string): Question | undefined {
  return overrides().get(id)?.data ?? BY_ID.get(id);
}

/** Active question bank for an exam: built-ins plus admin-added questions, minus disabled ones. */
export function questionsFor(exam: string): Question[] {
  const o = overrides();
  const base = (BANK[exam] ?? []).map((q) => o.get(q.id)?.data ?? q);
  const added = [...o.entries()].filter(([id, v]) => v.exam === exam && v.data && !BY_ID.has(id)).map(([, v]) => v.data!);
  return [...base, ...added].filter((q) => !o.get(q.id)?.disabled);
}

/** Which exam a question (built-in or admin-added) belongs to. */
export function examOf(id: string): string | undefined {
  return EXAM_OF.get(id) ?? overrides().get(id)?.exam;
}

export function isBuiltIn(id: string): boolean {
  return BY_ID.has(id);
}

export function overrideState(id: string): { edited: boolean; disabled: boolean } {
  const o = overrides().get(id);
  return { edited: !!o?.data, disabled: !!o?.disabled };
}

// Deterministic per-session option order, so reloading a quiz doesn't reshuffle answers under the user.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function toPublic(q: Question, seed: string): PublicQuestion {
  const opts = q.options.map((o) => ({ key: o.key, text: o.text }));
  let h = hash(seed + q.id);
  for (let i = opts.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return {
    id: q.id, domain: q.domain, topic: q.topic, difficulty: q.difficulty, type: q.type,
    selectCount: q.type === "multi" ? (q.selectCount ?? 2) : 1,
    stem: q.stem, prompt: q.prompt, options: opts,
  };
}

export function grade(q: Question, picks: string[]): boolean {
  const right = q.options.filter((o) => o.correct).map((o) => o.key);
  return right.length === picks.length && right.every((k) => picks.includes(k));
}

export function feedbackFor(q: Question, picks: string[]): Feedback {
  return {
    correct: grade(q, picks),
    picks,
    correctKeys: q.options.filter((o) => o.correct).map((o) => o.key),
    options: q.options.map((o) => ({ key: o.key, why: o.why })),
    explanation: q.explanation,
  };
}
