import { aiAvailable, answerWalkthrough, cachedAnswerWalkthrough } from "@/lib/ai";
import { fail, LIMIT_MESSAGE, textStream, tutorContext } from "../shared";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!aiAvailable) return fail(503, "The AI tutor isn't available right now.");
  const body = await req.json().catch(() => ({}));
  const ctx = await tutorContext(body.sessionId, body.questionId);
  if (ctx instanceof Response) return ctx;
  if (!ctx.answered) return fail(403, "Answer the question first.");
  const hit = await cachedAnswerWalkthrough(ctx.q);
  if (hit) return new Response(hit, { headers: { "content-type": "text/plain; charset=utf-8" } });
  if (!(await ctx.spend())) return fail(429, LIMIT_MESSAGE);
  return textStream(answerWalkthrough(ctx.q));
}
