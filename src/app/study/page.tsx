import Link from "next/link";
import type { Metadata } from "next";
import { currentOwner } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { answeredCount } from "@/lib/engine";
import { EXAM_LIST } from "@/lib/exams";

export const metadata: Metadata = { title: "Study sheets", robots: { index: false } };

export default async function StudyIndex() {
  const owner = await currentOwner();
  const exams = await Promise.all(EXAM_LIST.map(async (exam) => ({
    exam,
    answered: owner ? await answeredCount(owner, exam.slug) : 0,
    unlocked: owner?.userId ? (await getAccess(owner.userId, exam.slug)).active : false,
  })));
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Your study sheets</h1>
      <p className="mt-2 text-soft">One tidy sheet per exam: your weakest topics first, your notes and saved tutor explanations, and an AI tutor to ask about any topic. Part of the exam pass.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exams.map(({ exam, answered, unlocked }) => (
          <div key={exam.slug} className="card p-6">
            <p className="eyebrow">{exam.code}{!unlocked && <span className="pill ml-2 bg-brand-soft text-brand normal-case tracking-normal">🔒 Pass</span>}</p>
            <h2 className="mt-1 text-xl font-extrabold">{exam.shortName}</h2>
            <p className="mt-2 text-sm text-soft">{answered ? `Built from ${answered} question${answered === 1 ? "" : "s"} you've answered.` : "Answer a few practice questions to start this sheet."}</p>
            <Link className={`mt-4 ${unlocked ? "btn-primary" : "btn-ghost"}`} href={`/study/${exam.slug}`}>{unlocked ? "Open study sheet" : "See what's included"}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
