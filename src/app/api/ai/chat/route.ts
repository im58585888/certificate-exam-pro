import { aiAvailable, chat, type ChatTurn } from "@/lib/ai";
import { fail, LIMIT_MESSAGE, textStream, tutorContext } from "../shared";

export const maxDuration = 120;

const MAX_TURNS = 13;
const MAX_CHARS = 1500;

function validTurns(v: unknown): ChatTurn[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_TURNS) return null;
  const turns = v.map((t, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: typeof t?.content === "string" ? t.content.trim().slice(0, i % 2 === 0 ? MAX_CHARS : 6000) : "" }) as ChatTurn);
  if (turns.some((t, i) => !t.content || (v[i] as ChatTurn).role !== t.role) || turns.at(-1)!.role !== "user") return null;
  return turns;
}

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
