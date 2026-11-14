import "server-only";
import { one, query } from "./db";
import { currentOwner, type Owner } from "./auth";
import type { Mode } from "./engine";

export interface QuizSession {
  id: string;
  user_id: string | null;
  anon_id: string | null;
  exam: string;
  mode: Mode;
  question_ids: string[];
  time_limit_sec: number | null;
  created_at: Date;
  finished_at: Date | null;
  saved_at: Date | null;
  paused_at: Date | null;
  paused_sec: number;
}

export interface SessionAttempt {
  question_id: string;
  picks: string[];
  correct: boolean;
  time_ms: number | null;
}

function owns(s: QuizSession, owner: Owner | null): boolean {
  if (!owner) return false;
  return owner.userId ? s.user_id === owner.userId : s.user_id === null && s.anon_id === owner.anonId;
}

/** Loads a quiz session only if the current visitor owns it. */
export async function loadOwnedSession(id: string): Promise<{ session: QuizSession; owner: Owner } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const owner = await currentOwner();
  const session = await one<QuizSession>(`select * from quiz_sessions where id = $1`, [id]);
  if (!session || !owner || !owns(session, owner)) return null;
  return { session, owner };
}

export async function sessionAttempts(sessionId: string): Promise<SessionAttempt[]> {
  return query<SessionAttempt>(
    `select question_id, picks, correct, time_ms from attempts where session_id = $1 order by created_at`,
    [sessionId],
  );
}

/** When a timed exam's clock runs out (ms), counting any time it spent saved and paused. */
export function deadlineOf(s: QuizSession): number | null {
  return s.time_limit_sec ? new Date(s.created_at).getTime() + (s.time_limit_sec + s.paused_sec) * 1000 : null;
}

/** Exam mode ends when submitted or when the clock runs out. A saved (paused) exam never runs out. */
export function isExpired(s: QuizSession): boolean {
  const deadline = deadlineOf(s);
  return !!deadline && !s.paused_at && Date.now() > deadline + 5000;
}

/** Restarts a saved exam's clock, adding the paused time to its deadline. Returns the updated session. */
export async function resumeSession(s: QuizSession): Promise<QuizSession> {
  if (!s.paused_at) return s;
  return (await one<QuizSession>(
    `update quiz_sessions set paused_sec = paused_sec + greatest(0, extract(epoch from now() - paused_at))::int, paused_at = null
     where id = $1 and paused_at is not null returning *`,
    [s.id],
  )) ?? s;
}
