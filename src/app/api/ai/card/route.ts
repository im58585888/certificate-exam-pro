import { AiError, aiAvailable, failureCode, cachedCards, spendAllowance, writeCard } from "@/lib/ai";
import { currentOwner } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { getExam } from "@/lib/exams";
import { ensureBank } from "@/lib/questions";
import { studySheet } from "@/lib/studysheet";
import { fail, LIMIT_MESSAGE } from "../shared";

export const maxDuration = 120;

/** Writes the concept card for a topic on the visitor's study sheet (cards are shared once written). */
export async function POST(req: Request) {
  if (!aiAvailable) return fail(503, "The AI tutor isn't available right now.");
  const body = await req.json().catch(() => ({}));
  if (typeof body.exam !== "string" || typeof body.topic !== "string" || !getExam(body.exam)) return fail(400, "Bad request.");
  const owner = await currentOwner();
  if (!owner) return fail(404, "Topic not found.");
  await ensureBank();
  const entry = (await studySheet(owner, body.exam)).find((t) => t.topic === body.topic);
  if (!entry) return fail(404, "Topic not found.");
  const hit = (await cachedCards(body.exam, [{ topic: entry.topic, questions: entry.bank }])).get(entry.topic);
  if (hit) return Response.json({ card: hit });
  const access = await getAccess(owner.userId, body.exam);
  if (!(await spendAllowance(owner, access.active, access.admin))) return fail(429, LIMIT_MESSAGE);
  try {
    return Response.json({ card: await writeCard(body.exam, entry.topic, entry.bank) });
  } catch (err) {
    console.error("[ai] card failed", err);
    return fail(502, err instanceof AiError ? err.message : `Couldn't write this card (${failureCode(err)}). Please try again in a moment.`);
  }
}
