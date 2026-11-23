"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { one, query } from "@/lib/db";
import { getExam } from "@/lib/exams";
import { ensureBank, examOf, getQuestion, questionsFor } from "@/lib/questions";

// Study sheet notebook actions. The study sheet is part of the exam pass, so every action needs a signed-in
// learner with an active pass for that exam (admins included).

export type NotebookResult = { ok: true; id?: number; exam: string } | { ok: false; error: string; upsell?: "signed-out" | "no-pass" };

const MAX_BODY = 20_000;
const clip = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const done = (exam: string, id?: number): NotebookResult => { revalidatePath(`/study/${exam}`); return { ok: true, id, exam }; };

/** The signed-in learner's id when they hold a pass for `exam`, else the reason they can't use the study sheet. */
async function member(exam: string): Promise<{ userId: string } | NotebookResult> {
  const e = getExam(exam);
  if (!e) return { ok: false, error: "Unknown exam." };
  const user = await getUser();
  if (!user) return { ok: false, error: "Create an account and get the pass to use the study sheet.", upsell: "signed-out" };
  if (!(await getAccess(user.id, exam)).active) return { ok: false, error: `The study sheet is part of the ${e.code} pass.`, upsell: "no-pass" };
  return { userId: user.id };
}

async function ownsSection(userId: string, id: number, exam: string): Promise<boolean> {
  return !!(await one(`select 1 from study_sections where id = $1 and user_id = $2 and exam = $3`, [id, userId, exam]));
}

const topicDomain = (exam: string, topic: string) => questionsFor(exam).find((q) => q.topic === topic)?.domain ?? null;

/** Where an item goes: one of the exam's topics, or one of the learner's own topics. */
type Target = { topic?: string; sectionId?: number };

async function resolveTarget(userId: string, exam: string, t: Target): Promise<{ topic: string | null; domain: string | null; sectionId: number | null } | null> {
  if (t.sectionId) return (await ownsSection(userId, t.sectionId, exam)) ? { topic: null, domain: null, sectionId: t.sectionId } : null;
  if (t.topic) {
    await ensureBank();
    const domain = topicDomain(exam, t.topic);
    return domain ? { topic: t.topic, domain, sectionId: null } : null;
  }
  return null;
}

/** Saves tutor content. From a practice question it goes under that question's topic; otherwise under `target`. */
export async function saveClipAction(input: { questionId?: string; exam?: string; target?: Target; title?: string; body: string }): Promise<NotebookResult> {
  const body = clip(input.body, MAX_BODY);
  if (!body) return { ok: false, error: "Nothing to save." };
  let exam = input.exam ?? "";
  let where: { topic: string | null; domain: string | null; sectionId: number | null } | null = null;
  if (input.questionId) {
    await ensureBank();
    const q = getQuestion(input.questionId);
    if (!q) return { ok: false, error: "Question not found." };
    exam = examOf(q.id) ?? exam;
    where = { topic: q.topic, domain: q.domain, sectionId: null };
  }
  const m = await member(exam);
  if ("ok" in m) return m;
  if (!where) where = await resolveTarget(m.userId, exam, input.target ?? {});
  if (!where) return { ok: false, error: "Choose a topic to save it to." };
  const row = await one<{ id: number }>(
    `insert into study_items (user_id, exam, kind, topic, domain, section_id, title, body, source_question)
     values ($1, $2, 'clip', $3, $4, $5, $6, $7, $8) returning id`,
    [m.userId, exam, where.topic, where.domain, where.sectionId, clip(input.title, 160) || null, body, input.questionId ?? null],
  );
  return done(exam, row!.id);
}

export async function addNoteAction(input: { exam: string; target: Target; body: string }): Promise<NotebookResult> {
  const m = await member(input.exam);
  if ("ok" in m) return m;
  const body = clip(input.body, 4000);
  if (!body) return { ok: false, error: "Write something first." };
  const where = await resolveTarget(m.userId, input.exam, input.target);
  if (!where) return { ok: false, error: "Topic not found." };
  await query(
    `insert into study_items (user_id, exam, kind, topic, domain, section_id, body) values ($1, $2, 'note', $3, $4, $5, $6)`,
    [m.userId, input.exam, where.topic, where.domain, where.sectionId, body],
  );
  return done(input.exam);
}

/** Loads an item the learner owns and checks their pass for its exam. */
async function ownItem(id: number): Promise<{ userId: string; exam: string } | NotebookResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in first.", upsell: "signed-out" };
  const item = await one<{ exam: string }>(`select exam from study_items where id = $1 and user_id = $2`, [id, user.id]);
  if (!item) return { ok: false, error: "Item not found." };
  const m = await member(item.exam);
  return "ok" in m ? m : { userId: m.userId, exam: item.exam };
}

export async function editNoteAction(id: number, body: string): Promise<NotebookResult> {
  const o = await ownItem(id);
  if ("ok" in o) return o;
  const text = clip(body, 4000);
  if (!text) return { ok: false, error: "Write something first." };
  await query(`update study_items set body = $3 where id = $1 and user_id = $2 and kind = 'note'`, [id, o.userId, text]);
  return done(o.exam);
}

/** Removing is a soft delete so the sheet can offer Undo. It doesn't refresh the page, so the Undo stays on screen. */
export async function removeItemAction(id: number, undo = false): Promise<NotebookResult> {
  const o = await ownItem(id);
  if ("ok" in o) return o;
  await query(`update study_items set deleted_at = ${undo ? "null" : "now()"} where id = $1 and user_id = $2`, [id, o.userId]);
  return { ok: true, exam: o.exam };
}

/** Moves an item to another exam topic or one of the learner's own topics. */
export async function moveItemAction(id: number, target: Target): Promise<NotebookResult> {
  const o = await ownItem(id);
  if ("ok" in o) return o;
  const where = await resolveTarget(o.userId, o.exam, target);
  if (!where) return { ok: false, error: "Topic not found." };
  await query(`update study_items set topic = $3, domain = $4, section_id = $5 where id = $1 and user_id = $2`, [id, o.userId, where.topic, where.domain, where.sectionId]);
  return done(o.exam);
}

/** Pin to "Study these next", hide, or add an exam topic before practising it. */
export async function setTopicPrefAction(exam: string, topic: string, patch: { pinned?: boolean; hidden?: boolean; added?: boolean }): Promise<NotebookResult> {
  const m = await member(exam);
  if ("ok" in m) return m;
  await ensureBank();
  if (!topicDomain(exam, topic)) return { ok: false, error: "Topic not found." };
  await query(
    `insert into study_topic_prefs (user_id, exam, topic, pinned, hidden, added) values ($1, $2, $3, coalesce($4, false), coalesce($5, false), coalesce($6, false))
     on conflict (user_id, exam, topic) do update set pinned = coalesce($4, study_topic_prefs.pinned), hidden = coalesce($5, study_topic_prefs.hidden), added = coalesce($6, study_topic_prefs.added)`,
    [m.userId, exam, topic, patch.pinned ?? null, patch.hidden ?? null, patch.added ?? null],
  );
  return done(exam);
}

/** A learner's own topic, e.g. "Databases compared". */
export async function createSectionAction(exam: string, name: string): Promise<NotebookResult> {
  const m = await member(exam);
  if ("ok" in m) return m;
  const n = clip(name, 80);
  if (!n) return { ok: false, error: "Give the topic a name." };
  const count = await one<{ n: number }>(`select count(*)::int as n from study_sections where user_id = $1 and exam = $2`, [m.userId, exam]);
  if ((count?.n ?? 0) >= 30) return { ok: false, error: "You can have up to 30 of your own topics per exam." };
  const row = await one<{ id: number }>(`insert into study_sections (user_id, exam, name) values ($1, $2, $3) returning id`, [m.userId, exam, n]);
  return done(exam, row!.id);
}

async function ownSection(id: number): Promise<{ userId: string; exam: string } | NotebookResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in first.", upsell: "signed-out" };
  const s = await one<{ exam: string }>(`select exam from study_sections where id = $1 and user_id = $2`, [id, user.id]);
  if (!s) return { ok: false, error: "Topic not found." };
  const m = await member(s.exam);
  return "ok" in m ? m : { userId: m.userId, exam: s.exam };
}

export async function renameSectionAction(id: number, name: string): Promise<NotebookResult> {
  const o = await ownSection(id);
  if ("ok" in o) return o;
  const n = clip(name, 80);
  if (!n) return { ok: false, error: "Give the topic a name." };
  await query(`update study_sections set name = $3 where id = $1 and user_id = $2`, [id, o.userId, n]);
  return done(o.exam);
}

/** Deleting your own topic deletes the notes and saved items in it. */
export async function deleteSectionAction(id: number): Promise<NotebookResult> {
  const o = await ownSection(id);
  if ("ok" in o) return o;
  await query(`update study_items set deleted_at = now() where section_id = $1 and user_id = $2`, [id, o.userId]);
  await query(`delete from study_sections where id = $1 and user_id = $2`, [id, o.userId]);
  return done(o.exam);
}

/** "Practise again" on a study-sheet mistake: a short review session with just those questions (up to 20). */
export async function retryMistakesAction(form: FormData): Promise<void> {
  const exam = String(form.get("exam") ?? "");
  const m = await member(exam);
  if (!("userId" in m)) redirect(`/study/${exam}`);
  await ensureBank();
  const ids = [...new Set(form.getAll("id").map(String))].filter((id) => examOf(id) === exam && getQuestion(id)).slice(0, 20);
  if (!ids.length) redirect(`/study/${exam}`);
  const row = await one<{ id: string }>(
    `insert into quiz_sessions (user_id, exam, mode, question_ids) values ($1, $2, 'review', $3) returning id`,
    [m.userId, exam, ids],
  );
  redirect(`/quiz/${row!.id}`);
}
