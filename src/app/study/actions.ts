"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { getExam } from "@/lib/exams";
import { ensureBank, examOf, getQuestion } from "@/lib/questions";

// Study sheet notebook actions. Everything is scoped to the signed-in user; visitors without an account can't save.

export type NotebookResult = { ok: true; id?: number; exam: string } | { ok: false; error: string; signIn?: boolean };

const MAX_BODY = 20_000;
const clip = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const done = (exam: string, id?: number): NotebookResult => { revalidatePath(`/study/${exam}`); return { ok: true, id, exam }; };

async function signedIn() {
  const user = await getUser();
  return user ? user.id : null;
}

const NEED_ACCOUNT: NotebookResult = { ok: false, error: "Create a free account to save to your study sheet.", signIn: true };

/** Saves tutor content. From a question, the exam and topic come from that question; from the study tutor, from `exam`. */
export async function saveClipAction(input: { questionId?: string; exam?: string; title?: string; body: string; sectionId?: number }): Promise<NotebookResult> {
  const userId = await signedIn();
  if (!userId) return NEED_ACCOUNT;
  const body = clip(input.body, MAX_BODY);
  if (!body) return { ok: false, error: "Nothing to save." };
  let exam = input.exam ?? "";
  let topic: string | null = null;
  let domain: string | null = null;
  if (input.questionId) {
    await ensureBank();
    const q = getQuestion(input.questionId);
    if (!q) return { ok: false, error: "Question not found." };
    exam = examOf(q.id) ?? exam;
    topic = q.topic;
    domain = q.domain;
  }
  if (!getExam(exam)) return { ok: false, error: "Unknown exam." };
  const sectionId = input.sectionId && (await ownsSection(userId, input.sectionId, exam)) ? input.sectionId : null;
  const row = await one<{ id: number }>(
    `insert into study_items (user_id, exam, kind, topic, domain, section_id, title, body, source_question)
     values ($1, $2, 'clip', $3, $4, $5, $6, $7, $8) returning id`,
    [userId, exam, topic, domain, sectionId, clip(input.title, 160) || null, body, input.questionId ?? null],
  );
  return done(exam, row!.id);
}

export async function addNoteAction(input: { exam: string; topic?: string; domain?: string; sectionId?: number; body: string }): Promise<NotebookResult> {
  const userId = await signedIn();
  if (!userId) return NEED_ACCOUNT;
  const body = clip(input.body, 4000);
  if (!body) return { ok: false, error: "Write something first." };
  if (!getExam(input.exam)) return { ok: false, error: "Unknown exam." };
  const sectionId = input.sectionId && (await ownsSection(userId, input.sectionId, input.exam)) ? input.sectionId : null;
  await query(
    `insert into study_items (user_id, exam, kind, topic, domain, section_id, body) values ($1, $2, 'note', $3, $4, $5, $6)`,
    [userId, input.exam, sectionId ? null : clip(input.topic, 120) || null, sectionId ? null : clip(input.domain, 40) || null, sectionId, body],
  );
  return done(input.exam);
}

export async function editNoteAction(id: number, body: string): Promise<NotebookResult> {
  const userId = await signedIn();
  if (!userId) return NEED_ACCOUNT;
  const text = clip(body, 4000);
  if (!text) return { ok: false, error: "Write something first." };
  const row = await one<{ exam: string }>(`update study_items set body = $3 where id = $1 and user_id = $2 and kind = 'note' returning exam`, [id, userId, text]);
  return row ? done(row.exam) : { ok: false, error: "Note not found." };
}

/** Removing is a soft delete so the sheet can offer Undo. It doesn't refresh the page, so the Undo stays on screen. */
export async function removeItemAction(id: number, undo = false): Promise<NotebookResult> {
  const userId = await signedIn();
  if (!userId) return NEED_ACCOUNT;
  const row = await one<{ exam: string }>(
    `update study_items set deleted_at = ${undo ? "null" : "now()"} where id = $1 and user_id = $2 returning exam`,
    [id, userId],
  );
  return row ? { ok: true, exam: row.exam } : { ok: false, error: "Item not found." };
}

/** Moves an item into one of the learner's sections, or back under its exam topic (sectionId null). */
export async function moveItemAction(id: number, sectionId: number | null): Promise<NotebookResult> {
  const userId = await signedIn();
  if (!userId) return NEED_ACCOUNT;
  const item = await one<{ exam: string }>(`select exam from study_items where id = $1 and user_id = $2`, [id, userId]);
  if (!item) return { ok: false, error: "Item not found." };
  if (sectionId !== null && !(await ownsSection(userId, sectionId, item.exam))) return { ok: false, error: "Section not found." };
  await query(`update study_items set section_id = $3 where id = $1 and user_id = $2`, [id, userId, sectionId]);
  return done(item.exam);
}

export async function setCardHiddenAction(exam: string, topic: string, hidden: boolean): Promise<NotebookResult> {
  const userId = await signedIn();
  if (!userId) return NEED_ACCOUNT;
  if (!getExam(exam)) return { ok: false, error: "Unknown exam." };
  if (hidden) await query(`insert into study_hidden_cards (user_id, exam, topic) values ($1, $2, $3) on conflict do nothing`, [userId, exam, topic.slice(0, 120)]);
  else await query(`delete from study_hidden_cards where user_id = $1 and exam = $2 and topic = $3`, [userId, exam, topic]);
  return { ok: true, exam };
}

export async function createSectionAction(exam: string, name: string): Promise<NotebookResult> {
  const userId = await signedIn();
  if (!userId) return NEED_ACCOUNT;
  const n = clip(name, 80);
  if (!n) return { ok: false, error: "Give the section a name." };
  if (!getExam(exam)) return { ok: false, error: "Unknown exam." };
  const count = await one<{ n: number }>(`select count(*)::int as n from study_sections where user_id = $1 and exam = $2`, [userId, exam]);
  if ((count?.n ?? 0) >= 30) return { ok: false, error: "You can have up to 30 sections per exam." };
  const row = await one<{ id: number }>(`insert into study_sections (user_id, exam, name) values ($1, $2, $3) returning id`, [userId, exam, n]);
  return done(exam, row!.id);
}

export async function renameSectionAction(id: number, name: string): Promise<NotebookResult> {
  const userId = await signedIn();
  if (!userId) return NEED_ACCOUNT;
  const n = clip(name, 80);
  if (!n) return { ok: false, error: "Give the section a name." };
  const row = await one<{ exam: string }>(`update study_sections set name = $3 where id = $1 and user_id = $2 returning exam`, [id, userId, n]);
  return row ? done(row.exam) : { ok: false, error: "Section not found." };
}

/** Deleting a section keeps its items: they go back under their exam topic (or "Saved from the study tutor"). */
export async function deleteSectionAction(id: number): Promise<NotebookResult> {
  const userId = await signedIn();
  if (!userId) return NEED_ACCOUNT;
  const row = await one<{ exam: string }>(`delete from study_sections where id = $1 and user_id = $2 returning exam`, [id, userId]);
  return row ? done(row.exam) : { ok: false, error: "Section not found." };
}

async function ownsSection(userId: string, id: number, exam: string): Promise<boolean> {
  return !!(await one(`select 1 from study_sections where id = $1 and user_id = $2 and exam = $3`, [id, userId, exam]));
}
