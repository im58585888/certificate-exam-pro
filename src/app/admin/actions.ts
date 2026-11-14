"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { grantPass } from "@/lib/billing";
import { one, query } from "@/lib/db";
import { DEFAULT_EXAM, EXAMS } from "@/lib/exams";
import { ensureBank, examOf, getQuestion, isBuiltIn, type Question } from "@/lib/questions";
import { validateQuestion } from "@/lib/validate";

export interface SaveState {
  errors?: string[];
  saved?: boolean;
}

/** Saves an edited or new question as a database override after validating it with the bank rules. */
export async function saveQuestionAction(_: SaveState, form: FormData): Promise<SaveState> {
  const admin = await requireAdmin();
  await ensureBank(true);
  const mode = String(form.get("mode"));
  const exam = String(form.get("exam") ?? "");
  if (!(exam in EXAMS)) return { errors: ["Unknown exam."] };
  let q: Question;
  try {
    q = JSON.parse(String(form.get("json") ?? ""));
  } catch (e) {
    return { errors: [`Invalid JSON: ${(e as Error).message}`] };
  }
  const errors = validateQuestion(q, exam);
  if (mode === "edit" && q.id !== String(form.get("originalId"))) errors.push("The id can't be changed when editing.");
  if (mode === "new" && (isBuiltIn(q.id) || getQuestion(q.id))) errors.push(`A question with id "${q.id}" already exists.`);
  if (errors.length) return { errors };

  await query(
    `insert into question_overrides (question_id, exam, data, updated_by, updated_at) values ($1, $2, $3, $4, now())
     on conflict (question_id) do update set data = excluded.data, updated_by = excluded.updated_by, updated_at = now()`,
    [q.id, exam, JSON.stringify(q), admin.email],
  );
  await ensureBank(true);
  revalidatePath("/admin/questions");
  if (mode === "new") redirect(`/admin/questions/${encodeURIComponent(q.id)}?saved=1`);
  return { saved: true };
}

export async function setQuestionDisabledAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const disabled = form.get("disabled") === "true";
  await ensureBank(true);
  if (!getQuestion(id)) return;
  await query(
    `insert into question_overrides (question_id, exam, disabled, updated_by) values ($1, $2, $3, $4)
     on conflict (question_id) do update set disabled = excluded.disabled, updated_by = excluded.updated_by, updated_at = now()`,
    [id, examOf(id) ?? String(form.get("exam") ?? DEFAULT_EXAM), disabled, admin.email],
  );
  await ensureBank(true);
  revalidatePath(`/admin/questions/${encodeURIComponent(id)}`);
}

/** Drops an admin edit so the built-in version is used again (keeps the disabled flag). */
export async function revertQuestionAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  if (!isBuiltIn(id)) return;
  await query(`update question_overrides set data = null, updated_at = now() where question_id = $1`, [id]);
  await query(`delete from question_overrides where question_id = $1 and data is null and disabled = false`, [id]);
  await ensureBank(true);
  revalidatePath(`/admin/questions/${encodeURIComponent(id)}`);
}

export async function setReportStatusAction(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  if (!["open", "resolved", "dismissed"].includes(status)) return;
  await query(`update question_reports set status = $2, resolved_at = case when $2 = 'open' then null else now() end where id = $1`, [id, status]);
  revalidatePath("/admin/reports");
}

export async function grantCompPassAction(form: FormData) {
  await requireAdmin();
  const userId = String(form.get("userId"));
  const days = Math.min(365, Math.max(1, Number(form.get("days")) || 30));
  const exam = String(form.get("exam") ?? "");
  if (!(exam in EXAMS)) return;
  if (!(await one(`select 1 from users where id = $1`, [userId]))) return;
  await grantPass(userId, exam, `comp_${randomUUID()}`, 0, "comp", days);
  revalidatePath("/admin/users");
}

/** Permanently removes a question that was added in admin (built-in questions can only be disabled). */
export async function deleteAddedQuestionAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  if (isBuiltIn(id)) return;
  await query(`delete from question_overrides where question_id = $1`, [id]);
  await ensureBank(true);
  revalidatePath("/admin/questions");
  redirect("/admin/questions");
}

export async function setMessageStatusAction(form: FormData) {
  await requireAdmin();
  const status = String(form.get("status"));
  if (!["open", "answered", "archived"].includes(status)) return;
  await query(`update contact_messages set status = $2 where id = $1`, [Number(form.get("id")), status]);
  revalidatePath("/admin/messages");
}
