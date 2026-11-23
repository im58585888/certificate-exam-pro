import "server-only";
import { ownerClause, type Owner } from "./auth";
import { query } from "./db";
import { questionsFor, type Question } from "./questions";

// The study sheet is built from attempt history: every topic the learner has practised, weakest first.
// Nothing is stored per learner beyond attempts, so each finished session automatically adds to it.

/** A question the learner last got wrong, in full: the scenario, every option with whether it's right, whether they picked
 *  it and why, and the explanation. Shown on the study sheet once the learner has already answered it. */
export interface Mistake {
  questionId: string;
  stem: string;
  prompt: string;
  multi: boolean;
  options: { text: string; correct: boolean; picked: boolean; why: string }[];
  answer: string;
}

export interface SheetTopic {
  topic: string;
  domain: string;
  /** All questions in the bank for this topic (what the concept card is written from). */
  bank: Question[];
  seen: number;
  /** Questions whose latest answer was wrong. */
  missed: number;
  accuracy: number;
  firstSessionId: string;
  lastAt: Date;
  mistakes: Mistake[];
}

interface Row {
  question_id: string;
  picks: string[];
  correct: boolean;
  created_at: Date;
  session_id: string;
}

export async function studySheet(owner: Owner, exam: string): Promise<SheetTopic[]> {
  const [clause, param] = ownerClause(owner, 2);
  const rows = await query<Row>(
    `select question_id, picks, correct, created_at, session_id from attempts where exam = $1 and ${clause} order by created_at`,
    [exam, param],
  );
  const bank = questionsFor(exam);
  const byId = new Map(bank.map((q) => [q.id, q]));
  const byTopic = new Map<string, Question[]>();
  for (const q of bank) byTopic.set(q.topic, [...(byTopic.get(q.topic) ?? []), q]);

  const topics = new Map<string, { rows: Row[]; latest: Map<string, Row> }>();
  for (const r of rows) {
    const q = byId.get(r.question_id);
    if (!q) continue;
    const t = topics.get(q.topic) ?? { rows: [] as Row[], latest: new Map<string, Row>() };
    t.rows.push(r);
    t.latest.set(r.question_id, r);
    topics.set(q.topic, t);
  }

  const out: SheetTopic[] = [];
  for (const [topic, t] of topics) {
    const qs = byTopic.get(topic) ?? [];
    const wrong = [...t.latest.values()].filter((r) => !r.correct);
    out.push({
      topic,
      domain: qs[0]?.domain ?? "",
      bank: qs,
      seen: t.latest.size,
      missed: wrong.length,
      accuracy: t.rows.filter((r) => r.correct).length / t.rows.length,
      firstSessionId: t.rows[0].session_id,
      lastAt: new Date(t.rows.at(-1)!.created_at),
      mistakes: wrong.map((r) => {
        const q = byId.get(r.question_id)!;
        return {
          questionId: q.id, stem: q.stem, prompt: q.prompt, multi: q.type === "multi", answer: q.explanation.answer,
          options: q.options.map((o) => ({ text: o.text, correct: o.correct, picked: r.picks.includes(o.key), why: o.why })),
        };
      }),
    });
  }
  // Weakest first: topics with mistakes, then lower accuracy, then most recently practised.
  return out.sort((a, b) => Number(b.missed > 0) - Number(a.missed > 0) || a.accuracy - b.accuracy || b.lastAt.getTime() - a.lastAt.getTime());
}
