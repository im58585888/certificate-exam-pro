import "server-only";
import { one, query } from "./db";
import { ownerClause, type Owner } from "./auth";

export interface FlagRow {
  question_id: string;
  created_at: Date;
  kept_at: Date | null;
}

/** Correct answers in a row, since flagging (or last choosing to keep it), after which we ask "still weak?". */
export const FLAG_PROMPT_STREAK = 2;

export async function flagsFor(owner: Owner, exam: string): Promise<FlagRow[]> {
  const [clause, param] = ownerClause(owner, 2);
  return query<FlagRow>(`select question_id, created_at, kept_at from flags where exam = $1 and ${clause} order by created_at`, [exam, param]);
}

export async function setFlag(owner: Owner, exam: string, questionId: string, on: boolean): Promise<void> {
  const [clause, param] = ownerClause(owner, 2);
  if (!on) {
    await query(`delete from flags where question_id = $1 and ${clause}`, [questionId, param]);
    return;
  }
  const exists = await one(`select 1 from flags where question_id = $1 and ${clause}`, [questionId, param]);
  if (exists) return;
  await query(
    `insert into flags (user_id, anon_id, exam, question_id) values ($1, $2, $3, $4) on conflict do nothing`,
    [owner.userId ?? null, owner.anonId ?? null, exam, questionId],
  );
}

export async function keepFlag(owner: Owner, questionId: string): Promise<void> {
  const [clause, param] = ownerClause(owner, 2);
  await query(`update flags set kept_at = now() where question_id = $1 and ${clause}`, [questionId, param]);
}

/** True when a flagged question has now been answered correctly FLAG_PROMPT_STREAK times in a row since it was flagged or kept. */
export async function flagPromptDue(owner: Owner, questionId: string): Promise<boolean> {
  const [clause, param] = ownerClause(owner, 2);
  const flag = await one<{ since: Date }>(`select coalesce(kept_at, created_at) as since from flags where question_id = $1 and ${clause}`, [questionId, param]);
  if (!flag) return false;
  const rows = await query<{ correct: boolean }>(
    `select correct from attempts where question_id = $1 and ${clause} and created_at > $3 order by created_at desc limit ${FLAG_PROMPT_STREAK}`,
    [questionId, param, flag.since],
  );
  return rows.length === FLAG_PROMPT_STREAK && rows.every((r) => r.correct);
}
