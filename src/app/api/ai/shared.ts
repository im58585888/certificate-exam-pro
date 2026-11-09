import "server-only";
import { spendAllowance } from "@/lib/ai";
import { getAccess } from "@/lib/billing";
import { one } from "@/lib/db";
import { ensureBank, getQuestion, type Question } from "@/lib/questions";
import { loadOwnedSession, type QuizSession } from "@/lib/quiz";
import type { Owner } from "@/lib/auth";

export const fail = (status: number, error: string) => Response.json({ error }, { status });

export const LIMIT_MESSAGE = "You've reached today's limit for the AI tutor. It resets within 24 hours.";

export interface TutorContext {
  session: QuizSession;
  owner: Owner;
  q: Question;
  /** The learner has answered this question and may see the solution. */
  answered: boolean;
  spend: () => Promise<boolean>;
}

/**
 * The tutor works on questions in a session the visitor owns. Timed mock exams get no help until they're submitted,
 * and the solution is only discussed once the question has been answered.
 */
export async function tutorContext(sessionId: unknown, questionId: unknown): Promise<TutorContext | Response> {
  if (typeof sessionId !== "string" || typeof questionId !== "string") return fail(400, "Bad request.");
  await ensureBank();
  const loaded = await loadOwnedSession(sessionId);
  if (!loaded || !loaded.session.question_ids.includes(questionId)) return fail(404, "Question not found.");
  const { session, owner } = loaded;
  const q = getQuestion(questionId);
  if (!q) return fail(404, "Question not found.");
  if (session.mode === "exam" && !session.finished_at) return fail(403, "The tutor is off during timed mock exams, like the real test.");
  const attempt = await one(`select 1 from attempts where session_id = $1 and question_id = $2`, [sessionId, questionId]);
  return {
    session, owner, q,
    answered: !!attempt,
    spend: async () => {
      const access = await getAccess(owner.userId, session.exam);
      return spendAllowance(owner, access.active, access.admin);
    },
  };
}

/** Streams generated text as a plain-text response. */
export function textStream(gen: AsyncGenerator<string>): Response {
  const enc = new TextEncoder();
  return new Response(new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await gen.next();
        if (done) controller.close();
        else controller.enqueue(enc.encode(value));
      } catch (err) {
        console.error("[ai] stream failed", err);
        controller.enqueue(enc.encode("\n\nThe tutor hit a problem. Please try again."));
        controller.close();
      }
    },
    cancel() { gen.return(undefined); },
  }), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
