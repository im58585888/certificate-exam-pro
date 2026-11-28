import "server-only";
import { cachedPlan, writePlan, type PlanInput } from "./ai";
import type { ExamInfo as Exam } from "./exams";
import { resolvePlan, studyData, type ResolvedPlan, type StudyData } from "./gaps";
import { studySheet } from "./studysheet";

// Loads a learner's study sheet data and Mia's plan for it. Without `write`, only a saved plan is used (the page renders
// with it, or with the word-matching stand-in); with `write`, a missing or out-of-date plan is written, if allowed.

export async function studyPlanFor(userId: string, exam: Exam, opts: { write?: () => Promise<boolean> } = {}): Promise<ResolvedPlan | "limit"> {
  const data = studyData(await studySheet({ userId }, exam.slug));
  return planFrom(userId, exam, data, opts);
}

export async function planFrom(userId: string, exam: Exam, data: StudyData, opts: { write?: () => Promise<boolean> } = {}): Promise<ResolvedPlan | "limit"> {
  if (!data.mistakes.length) return resolvePlan(null, data);
  const input: PlanInput = {
    ownerKey: userId,
    exam: exam.slug,
    examName: `${exam.code} ${exam.name}`,
    mistakes: data.mistakes.slice(0, 120).map((m) => ({ id: m.id, topic: m.topic, question: m.question, you: m.you, answer: m.answer })),
  };
  const hit = await cachedPlan(input);
  if (hit || !opts.write) return resolvePlan(hit, data);
  if (!(await opts.write())) return "limit";
  return resolvePlan(await writePlan(input), data);
}
