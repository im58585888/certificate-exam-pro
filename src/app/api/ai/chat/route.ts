import { aiAvailable, chat } from "@/lib/ai";
import { fail, LIMIT_MESSAGE, textStream, tutorContext, validTurns } from "../shared";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!aiAvailable) return fail(503, "The AI tutor isn't available right now.");
  const body = await req.json().catch(() => ({}));
  const turns = validTurns(body.turns);
  if (!turns) return fail(400, "Bad request.");
  const ctx = await tutorContext(body.sessionId, body.questionId);
  if (ctx instanceof Response) return ctx;
  if (!(await ctx.spend())) return fail(429, LIMIT_MESSAGE);
  return textStream(chat(ctx.q, ctx.answered, turns));
}
