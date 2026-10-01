import { getExam } from "./exams";
import type { Question } from "./questions";

/** Same rules as scripts/validate-questions.mjs, used when admins edit or add questions. */
export function validateQuestion(q: Partial<Question>, exam: string): string[] {
  const DOMAINS = getExam(exam)?.domains.map((d) => d.id) ?? [];
  const errors: string[] = [];
  for (const k of ["id", "domain", "topic", "difficulty", "type", "stem", "prompt", "options", "explanation"] as const) {
    if (!q[k]) errors.push(`Missing "${k}".`);
  }
  if (errors.length) return errors;
  if (!/^[a-z0-9-]+$/.test(q.id!)) errors.push("id may only contain lowercase letters, digits and hyphens.");
  if (!DOMAINS.includes(q.domain!)) errors.push(`domain must be one of ${DOMAINS.join(", ")}.`);
  if (!["easy", "medium", "hard"].includes(q.difficulty!)) errors.push("difficulty must be easy, medium or hard.");
  if (!["single", "multi"].includes(q.type!)) errors.push("type must be single or multi.");
  const opts = q.options!;
  if (!Array.isArray(opts)) return [...errors, "options must be an array."];
  const correct = opts.filter((o) => o.correct).length;
  const need = q.type === "multi" ? q.selectCount ?? 0 : 1;
  if (q.type === "multi" && (!q.selectCount || q.selectCount < 2)) errors.push("multi-select questions need selectCount ≥ 2.");
  if (correct !== need) errors.push(`Expected ${need} correct option(s), found ${correct}.`);
  if (q.type === "single" && opts.length !== 4) errors.push("Single-answer questions need exactly 4 options.");
  if (q.type === "multi" && opts.length < 5) errors.push("Multi-select questions need at least 5 options.");
  if (q.type === "multi" && !/select (two|three)/i.test(q.prompt!)) errors.push('Multi-select prompts must say "(Select TWO.)" or "(Select THREE.)".');
  const keys = new Set<string>();
  opts.forEach((o, i) => {
    if (!o.key || keys.has(o.key)) errors.push(`Option ${i + 1} needs a unique key.`);
    keys.add(o.key);
    if (!o.text?.trim()) errors.push(`Option ${o.key ?? i + 1} needs text.`);
    if (!o.why || o.why.length < 40) errors.push(`Option ${o.key ?? i + 1} needs a real explanation (40+ characters).`);
  });
  const e = q.explanation!;
  for (const k of ["answer", "concept", "examTip"] as const) if (!e[k]?.trim()) errors.push(`explanation.${k} is required.`);
  if (!e.references?.length) errors.push("Add at least one reference link.");
  e.references?.forEach((r) => { if (!/^https:\/\//.test(r.url ?? "")) errors.push(`Reference "${r.title}" needs an https URL.`); });
  if (!Array.isArray(q.tags)) errors.push("tags must be an array (can be empty).");
  return errors;
}
