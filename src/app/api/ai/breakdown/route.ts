import { AiError, aiAvailable, failureCode, cachedBreakdown, writeBreakdown } from "@/lib/ai";
import { fail, LIMIT_MESSAGE, tutorContext } from "../shared";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!aiAvailable) return fail(503, "The AI tutor isn't available right now.");
  const body = await req.json().catch(() => ({}));
  const ctx = await tutorContext(body.sessionId, body.questionId);
  if (ctx instanceof Response) return ctx;
  const hit = await cachedBreakdown(ctx.q);
  if (hit) return Response.json({ breakdown: hit });
  if (!(await ctx.spend())) return fail(429, LIMIT_MESSAGE);
  try {
    return Response.json({ breakdown: await writeBreakdown(ctx.q) });
  } catch (err) {
    console.error("[ai] breakdown failed", err);
    return fail(502, err instanceof AiError ? err.message : `The tutor couldn't respond (${failureCode(err)}). Please try again in a moment.`);
  }
}
