import "server-only";
import { one, query } from "./db";
import { currentOwner, type Owner } from "./auth";

export interface QuizSession {
  id: string;
  user_id: string | null;
  anon_id: string | null;
  exam: string;
  mode: "trial" | "practice" | "reinforce" | "review" | "exam";
  question_ids: string[];
  time_limit_sec: number | null;
  created_at: Date;
  finished_at: Date | null;
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

/** Exam mode ends when submitted or when the clock runs out. */
export function isExpired(s: QuizSession): boolean {
  return !!s.time_limit_sec && Date.now() > new Date(s.created_at).getTime() + s.time_limit_sec * 1000 + 5000;
}
