import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CardLoader } from "@/components/CardLoader";
import { ConceptCardBody } from "@/components/StudyCards";
import { AddNote, ConceptCardSlot, ItemCard, NewSection, SectionHeader, StudyTutor, type SheetItem } from "@/components/StudyNotebook";
import { aiAvailable, cachedCards } from "@/lib/ai";
import { currentOwner, getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { DOMAIN_NAME, getExam } from "@/lib/exams";
import { loadNotebook, type StudyItem } from "@/lib/notebook";
import { ensureBank, questionsFor } from "@/lib/questions";
import { studySheet } from "@/lib/studysheet";

export const metadata: Metadata = { title: "Study sheet", robots: { index: false } };

const toSheetItem = (i: StudyItem): SheetItem => ({
  id: i.id, kind: i.kind, title: i.title, body: i.body, sourceQuestion: i.source_question, sectionId: i.section_id,
  savedOn: new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
});

export default async function StudySheetPage({ params }: PageProps<"/study/[exam]">) {
  const { exam: slug } = await params;
  const exam = getExam(slug);
  if (!exam) notFound();
  await ensureBank();
  const [owner, user] = await Promise.all([currentOwner(), getUser()]);
  const signedIn = !!user;
  const topics = owner ? await studySheet(owner, slug) : [];
  const notebook = user ? await loadNotebook(user.id, slug) : { items: [], sections: [], hidden: new Set<string>() };
  const access = user ? await getAccess(user.id, slug) : null;
  const cards = await cachedCards(slug, topics.map((t) => ({ topic: t.topic, questions: t.bank })));

  // Items in a custom section show there; the rest under their exam topic, or "Saved from the study tutor" when they have none.
  const inSection = (id: number) => notebook.items.filter((i) => i.section_id === id).map(toSheetItem);
  const loose = notebook.items.filter((i) => i.section_id === null);
  const byTopic = new Map<string, StudyItem[]>();
  for (const i of loose) if (i.topic) byTopic.set(i.topic, [...(byTopic.get(i.topic) ?? []), i]);
  const unsorted = loose.filter((i) => !i.topic).map(toSheetItem);

  // Topics come from practice, plus any topic the learner saved something under without practising it yet.
  const bank = questionsFor(slug);
  const practised = new Set(topics.map((t) => t.topic));
  const extra = [...byTopic.keys()].filter((t) => !practised.has(t)).map((topic) => ({
    topic, domain: byTopic.get(topic)![0].domain ?? bank.find((q) => q.topic === topic)?.domain ?? "", seen: 0, missed: 0, mistakes: [] as typeof topics[number]["mistakes"], practised: false,
  }));
  const allTopics = [...topics.map((t) => ({ ...t, practised: true })), ...extra];
  const domains = exam.domains.map((d) => ({ ...d, topics: allTopics.filter((t) => t.domain === d.id) })).filter((d) => d.topics.length);

  const missed = topics.reduce((s, t) => s + t.missed, 0);
  const sections = notebook.sections.map((s) => ({ id: s.id, name: s.name }));
  const saved = notebook.items.length;
  const weak = topics.filter((t) => t.missed > 0).slice(0, 2).map((t) => t.topic);
  const suggestions = [
    ...weak.map((t) => `Explain ${t} again, simply`),
    "Quiz me on my weak topics",
    exam.slug === "aif-c01" ? "Compare Bedrock, SageMaker and Amazon Q" : "Compare RDS, Aurora and DynamoDB",
    "Draw how a VPC connects to the internet",
  ].slice(0, 4);
  const tutorAccess = !aiAvailable ? "off" : !user ? "signed-out" : access?.active ? "ok" : "no-pass";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="eyebrow">{exam.code} · Study sheet</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your study sheet</h1>
          <p className="mt-2 max-w-2xl text-soft">
            {topics.length || saved
              ? `${topics.length} concept${topics.length === 1 ? "" : "s"} from your practice${missed ? `, ${missed} question${missed === 1 ? "" : "s"} still to fix` : ""}${saved ? `, ${saved} saved item${saved === 1 ? "" : "s"} and note${saved === 1 ? "" : "s"}` : ""}. Save anything useful from the tutor with 📌.`
              : "Your sheet is empty. Answer some practice questions and the concepts they cover appear here. Save anything useful from the AI tutor with 📌."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {signedIn && <NewSection exam={slug} />}
          {(topics.length > 0 || saved > 0) && <Link className="btn-primary" href={`/study/${slug}/cheatsheet`}>One-page cheat sheet</Link>}
          {missed > 0 && <Link className="btn-ghost" href={`/study/${slug}/cheatsheet?only=weak`}>Cheat sheet: weak topics</Link>}
        </div>
      </div>
      {!signedIn && (
        <p className="mt-5 rounded-xl bg-brand-soft px-4 py-3 text-sm text-ink">
          <Link href="/register" className="font-bold text-brand underline">Create a free account</Link> to save tutor explanations, tables and diagrams here, and to write your own notes.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {!topics.length && !saved && <Link className="btn-primary" href={`/practice/${slug}`}>Start practising</Link>}

          {notebook.sections.map((s) => {
            const items = inSection(s.id);
            return (
              <section key={s.id} className="card mb-4 p-5">
                <SectionHeader section={s} />
                <div className="mt-3 space-y-2.5">
                  {items.length === 0 && <p className="text-sm text-muted">Empty. Use &ldquo;Move to section&rdquo; on any saved item or note, or add a note here.</p>}
                  {items.map((i) => <ItemCard key={i.id} item={i} sections={sections} signedIn={signedIn} />)}
                  <AddNote exam={slug} sectionId={s.id} signedIn={signedIn} />
                </div>
              </section>
            );
          })}

          {unsorted.length > 0 && (
            <section className="card mb-4 p-5">
              <h2 className="text-lg font-extrabold">✨ Saved from the study tutor</h2>
              <div className="mt-3 space-y-2.5">{unsorted.map((i) => <ItemCard key={i.id} item={i} sections={sections} signedIn={signedIn} />)}</div>
            </section>
          )}

          {domains.map((d) => (
            <section key={d.id} className="mb-10">
              <h2 className="text-lg font-extrabold">{DOMAIN_NAME[d.id] ?? d.name}</h2>
              <div className="mt-3 grid gap-4 xl:grid-cols-2">
                {d.topics.map((t) => {
                  const card = cards.get(t.topic);
                  const items = (byTopic.get(t.topic) ?? []).map(toSheetItem);
                  return (
                    <article key={t.topic} className="card flex flex-col p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-lg font-extrabold">{card?.title ?? t.topic}</h3>
                        {t.practised && (
                          <span className={`pill ${t.missed ? "bg-bad-soft text-bad" : "bg-ok-soft text-ok"}`}>{t.seen} seen{t.missed ? ` · ${t.missed} to fix` : " · all correct"}</span>
                        )}
                      </div>
                      {t.practised && (
                        <div className="mt-3">
                          <ConceptCardSlot exam={slug} topic={t.topic} hidden={notebook.hidden.has(t.topic)} signedIn={signedIn}>
                            {card ? <ConceptCardBody card={card} /> : aiAvailable ? <CardLoader exam={slug} topic={t.topic} /> : <p className="text-sm text-muted">Concept notes appear here when the AI tutor is switched on.</p>}
                          </ConceptCardSlot>
                        </div>
                      )}
                      {items.length > 0 && <div className="mt-4 space-y-2.5">{items.map((i) => <ItemCard key={i.id} item={i} sections={sections} signedIn={signedIn} />)}</div>}
                      {t.mistakes.length > 0 && (
                        <div className="mt-4 border-t border-dashed border-line pt-3 text-sm">
                          <b className="text-bad">Your mistakes</b>
                          <ul className="mt-1.5 space-y-2">
                            {t.mistakes.map((m) => (
                              <li key={m.questionId}>
                                <span className="text-soft">{m.prompt}</span>
                                <span className="mt-0.5 block">You chose <b className="text-bad">{m.picked.join(" + ")}</b>; the answer was <b className="text-ok">{m.correct.join(" + ")}</b>.</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-3"><AddNote exam={slug} topic={t.topic} domain={t.domain} signedIn={signedIn} /></div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <StudyTutor exam={slug} examCode={exam.code} access={tutorAccess} signedIn={signedIn} suggestions={suggestions} />
      </div>
    </div>
  );
}
