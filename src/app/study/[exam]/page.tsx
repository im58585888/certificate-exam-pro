import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { upsellHref } from "@/lib/sheetAccess";
import { MiaPose } from "@/components/Mia";
import { StudyByService } from "@/components/StudyByService";
import { aiAvailable } from "@/lib/ai";
import { currentOwner, getUser } from "@/lib/auth";
import { getAccess, paymentsMode } from "@/lib/billing";
import { getExam } from "@/lib/exams";
import { loadNotebook, type StudyItem } from "@/lib/notebook";
import { ensureBank } from "@/lib/questions";
import { studySheet } from "@/lib/studysheet";
import { studyData } from "@/lib/gaps";
import { planFrom } from "@/lib/studyplan";

export const metadata: Metadata = { title: "Study sheet", robots: { index: false } };

const toItem = (i: StudyItem) => ({
  id: i.id, kind: i.kind, title: i.title, body: i.body, sourceQuestion: i.source_question,
  savedOn: new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
});

/** Only links back into the learner's own practice: a quiz or results page on this site. */
const safeBack = (v: unknown) => (typeof v === "string" && /^\/(quiz|results)\/[0-9a-f-]{36}(\?[\w=&%.-]*)?(#[\w.-]*)?$/i.test(v) ? v : null);

function BackBar({ href }: { href: string }) {
  return (
    <Link href={href} className="mb-5 flex w-fit items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-4 py-2 text-sm font-bold text-brand hover:border-brand">
      ← {href.startsWith("/quiz/") ? "Back to your question" : "Back to your results"}
    </Link>
  );
}

export default async function StudySheetPage({ params, searchParams }: PageProps<"/study/[exam]">) {
  const { exam: slug } = await params;
  const back = safeBack((await searchParams).back);
  const exam = getExam(slug);
  if (!exam) notFound();
  await ensureBank();
  const [owner, user] = await Promise.all([currentOwner(), getUser()]);
  const topics = owner ? await studySheet(owner, slug) : [];
  const access = user ? await getAccess(user.id, slug) : null;

  // The study sheet is part of the exam pass. Everyone else sees what it does and how to unlock it.
  if (!access?.active) return <Locked exam={exam} practised={topics.length} access={user ? "no-pass" : "signed-out"} back={back} />;

  const notebook = await loadNotebook(user!.id, slug);
  const data = studyData(topics);
  const plan = await planFrom(user!.id, exam, data);

  // Notes are filed under an exam topic or one of the learner's own topics; "Move to…" lists both.
  const examTopics = [...new Set([...topics.map((t) => t.topic), ...notebook.items.filter((i) => i.topic && !i.section_id).map((i) => i.topic!)])].sort();
  const destinations = [
    ...examTopics.map((t) => ({ value: `t:${t}`, label: t })),
    ...notebook.sections.map((sec) => ({ value: `s:${sec.id}`, label: sec.name })),
  ];
  const notes = notebook.items.map((i) => ({ ...toItem(i), where: i.section_id ? `s:${i.section_id}` : `t:${i.topic ?? ""}` }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {back && <BackBar href={back} />}
      <p className="eyebrow">{exam.code} · Study sheet</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Your study sheet</h1>
      <div className="mt-5">
        <StudyByService exam={slug} examCode={exam.code} mistakes={data.mistakes} records={data.records}
          initialPlan={plan === "limit" ? { summary: "", focus: [], groups: data.fallbackGroups, byMia: false } : plan}
          tutorOn={aiAvailable} notes={notes} destinations={destinations} />
      </div>
    </div>
  );
}

function Locked({ exam, practised, access, back }: { exam: NonNullable<ReturnType<typeof getExam>>; practised: number; access: "no-pass" | "signed-out"; back: string | null }) {
  const features = [
    ["🎯", "Your gaps, diagnosed", "The AWS services to deep dive, the ones you mix up, and the concepts you keep missing, with Mia's read on the pattern."],
    ["📌", "Save from the AI tutor", "Keep explanations, tables and diagrams from any practice question."],
    ["📝", "Your own notes and topics", "Write notes in your own words, add topics, hide what you've mastered."],
    ["✨", "Ask Mia anything", "Your AI tutor compares services, draws how things connect, or quizzes you, and you save the answers."],
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {back && <BackBar href={back} />}
      <MiaPose pose="welcoming" height={150} alt="Mia, your AI tutor" className="float-right ml-4 hidden sm:block" />
      <p className="eyebrow">{exam.code} · Study sheet</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Your personal study sheet <span className="pill ml-1 bg-brand-soft align-middle text-sm text-brand">Pass</span></h1>
      <p className="mt-2 text-soft">
        {practised
          ? `You've already practised ${practised} topic${practised === 1 ? "" : "s"}. They're ready to go on your study sheet as soon as you unlock it.`
          : "Everything you study, organised in one tidy place, built from your practice."}
      </p>
      <div className="clear-both mt-6 grid gap-3 sm:grid-cols-2">
        {features.map(([icon, title, body]) => (
          <div key={title} className="card p-4">
            <p className="font-extrabold"><span aria-hidden className="mr-1.5">{icon}</span>{title}</p>
            <p className="mt-1 text-sm text-soft">{body}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link className="btn-primary !px-6 !py-3" href={upsellHref(access)}>
          {access === "signed-out" ? "Create an account" : paymentsMode === "waitlist" ? "Get notified when passes launch" : `Get the ${exam.code} pass`}
        </Link>
        <Link className="btn-ghost" href={`/practice/${exam.slug}`}>Keep practising</Link>
      </div>
      <p className="mt-3 text-xs text-muted">The study sheet is part of the {exam.code} pass, along with unlimited practice and mock exams.</p>
    </div>
  );
}
