import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { upsellHref } from "@/lib/sheetAccess";
import { MiaPose } from "@/components/Mia";
import { StudySheet, type TopicView } from "@/components/StudySheet";
import { aiAvailable, cachedCards } from "@/lib/ai";
import { currentOwner, getUser } from "@/lib/auth";
import { getAccess, paymentsMode } from "@/lib/billing";
import { DOMAIN_NAME, DOMAIN_SHORT, getExam } from "@/lib/exams";
import { loadNotebook, type StudyItem } from "@/lib/notebook";
import { ensureBank, questionsFor } from "@/lib/questions";
import { studySheet } from "@/lib/studysheet";

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
  const bank = questionsFor(slug);
  const domainOf = new Map(bank.map((q) => [q.topic, q.domain]));
  const practised = new Map(topics.map((t) => [t.topic, t]));
  // Exam topics on the sheet: practised ones, ones the learner added, pinned or saved something to.
  const names = new Set([
    ...topics.map((t) => t.topic),
    ...[...notebook.prefs.values()].filter((p) => p.added || p.pinned || p.hidden).map((p) => p.topic),
    ...notebook.items.filter((i) => i.topic && !i.section_id).map((i) => i.topic!),
  ].filter((t) => domainOf.has(t)));
  const cards = await cachedCards(slug, [...names].map((topic) => ({ topic, questions: bank.filter((q) => q.topic === topic) })));

  const examTopics: TopicView[] = [...names].map((topic) => {
    const p = practised.get(topic);
    const pref = notebook.prefs.get(topic);
    return {
      key: `t:${topic}`, name: cards.get(topic)?.title ?? topic, topic, domain: domainOf.get(topic),
      practised: !!p, seen: p?.seen ?? 0, missed: p?.missed ?? 0, accuracy: p ? p.accuracy : null,
      pinned: !!pref?.pinned, hidden: !!pref?.hidden, card: cards.get(topic) ?? null,
      items: notebook.items.filter((i) => i.topic === topic && !i.section_id).map(toItem),
      mistakes: p?.mistakes ?? [],
    };
  });
  // Practised topics keep the weakest-first order from studySheet; added ones follow.
  const order = new Map(topics.map((t, i) => [t.topic, i]));
  examTopics.sort((a, b) => (order.get(a.topic!) ?? 1e6) - (order.get(b.topic!) ?? 1e6) || a.name.localeCompare(b.name));
  const ownTopics: TopicView[] = notebook.sections.map((s) => ({
    key: `s:${s.id}`, name: s.name, sectionId: s.id, practised: false, seen: 0, missed: 0, accuracy: null,
    pinned: false, hidden: false, card: null, items: notebook.items.filter((i) => i.section_id === s.id).map(toItem), mistakes: [],
  }));

  const allBankTopics = [...new Set(bank.map((q) => q.topic))];
  const addable = allBankTopics.filter((t) => !names.has(t)).sort()
    .map((topic) => ({ topic, domainName: exam.domains.find((d) => d.id === domainOf.get(topic))?.name ?? "" }));
  const missed = topics.reduce((s, t) => s + t.missed, 0);
  const saved = notebook.items.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {back && <BackBar href={back} />}
      <p className="eyebrow">{exam.code} · Study sheet</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Your study sheet</h1>
      <p className="mt-2 max-w-2xl text-soft">
        {names.size || ownTopics.length
          ? `${names.size + ownTopics.length} topic${names.size + ownTopics.length === 1 ? "" : "s"}${missed ? `, ${missed} question${missed === 1 ? "" : "s"} to fix` : ""}${saved ? `, ${saved} saved note${saved === 1 ? "" : "s"}` : ""}. Open a topic for its summary, your notes and mistakes; the AI tutor follows the topic you open.`
          : "Empty for now. Practise some questions and their topics appear here, or add a topic yourself."}
      </p>
      {!names.size && !ownTopics.length && <Link className="btn-primary mt-4" href={`/practice/${slug}`}>Start practising</Link>}
      <div className="mt-5">
        <StudySheet exam={slug} examCode={exam.code} domains={exam.domains.map((d) => ({ id: d.id, name: DOMAIN_NAME[d.id] ?? d.name, short: DOMAIN_SHORT[d.id] ?? d.name }))}
          topics={[...examTopics, ...ownTopics]} addable={addable} tutorOn={aiAvailable} />
      </div>
    </div>
  );
}

function Locked({ exam, practised, access, back }: { exam: NonNullable<ReturnType<typeof getExam>>; practised: number; access: "no-pass" | "signed-out"; back: string | null }) {
  const features = [
    ["🎯", "Study these next", "Your weakest topics, picked for you every time you open it."],
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
