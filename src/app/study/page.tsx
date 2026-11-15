import Link from "next/link";
import type { Metadata } from "next";
import { currentOwner } from "@/lib/auth";
import { answeredCount } from "@/lib/engine";
import { EXAM_LIST } from "@/lib/exams";

export const metadata: Metadata = { title: "Study sheets", robots: { index: false } };

export default async function StudyIndex() {
  const owner = await currentOwner();
  const exams = await Promise.all(EXAM_LIST.map(async (exam) => ({ exam, answered: owner ? await answeredCount(owner, exam.slug) : 0 })));
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Your study sheets</h1>
      <p className="mt-2 text-soft">Every practice session adds the concepts it covered, with the mistakes you made. Save tutor explanations, tables and diagrams with 📌, add your own notes, and ask the study tutor anything.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exams.map(({ exam, answered }) => (
          <div key={exam.slug} className="card p-6">
            <p className="eyebrow">{exam.code}</p>
            <h2 className="mt-1 text-xl font-extrabold">{exam.shortName}</h2>
            <p className="mt-2 text-sm text-soft">{answered ? `Built from ${answered} question${answered === 1 ? "" : "s"} you've answered.` : "Answer a few practice questions to start this sheet."}</p>
            <Link className={`mt-4 ${answered ? "btn-primary" : "btn-ghost"}`} href={answered ? `/study/${exam.slug}` : `/practice/${exam.slug}`}>{answered ? "Open study sheet" : "Start practising"}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
