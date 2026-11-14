import Link from "next/link";
import type { Metadata } from "next";
import { currentOwner, getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { answeredCount } from "@/lib/engine";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS } from "@/lib/exams";
import { ensureBank, questionsFor } from "@/lib/questions";

export const metadata: Metadata = { title: "Choose an exam" };

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function PracticeIndex() {
  await ensureBank();
  const user = await getUser();
  const owner = await currentOwner();
  const cards = await Promise.all(
    EXAM_LIST.map(async (exam) => ({
      exam,
      bank: questionsFor(exam.slug).length,
      access: await getAccess(user?.id, exam.slug),
      used: owner ? await answeredCount(owner, exam.slug) : 0,
    })),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Choose an exam</h1>
      <p className="mt-2 text-soft">Each exam has its own {FREE_TRIAL_QUESTIONS}-question free trial and its own pass.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ exam, bank, access, used }) => (
          <Link key={exam.slug} href={`/practice/${exam.slug}`} className="card group flex flex-col p-6 transition hover:border-brand">
            <div className="flex items-center justify-between gap-2">
              <span className="pill bg-brand-soft text-brand">{exam.vendor} · {exam.code}</span>
              <span className="text-xs font-bold uppercase tracking-wide text-muted">{exam.level}</span>
            </div>
            <h2 className="mt-3 text-xl font-extrabold">{exam.name}</h2>
            <p className="mt-1 flex-1 text-soft">{exam.blurb}</p>
            <p className="mt-4 text-sm text-muted">{bank} questions · {exam.examQuestions}-question mock exam in {exam.examMinutes} min</p>
            <p className="mt-3 text-sm font-semibold">
              {access.admin ? <span className="text-ok">Admin: everything unlocked</span>
                : access.active ? <span className="text-ok">Pass active until {fmt(access.endsAt!)}</span>
                : <span className="text-soft">{Math.max(0, FREE_TRIAL_QUESTIONS - used)} of {FREE_TRIAL_QUESTIONS} free questions left</span>}
            </p>
            <span className="mt-4 font-bold text-brand group-hover:underline">Open {exam.code} practice →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
