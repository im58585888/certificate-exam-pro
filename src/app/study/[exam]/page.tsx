import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CardLoader } from "@/components/CardLoader";
import { ConceptCardBody } from "@/components/StudyCards";
import { aiAvailable, cachedCards } from "@/lib/ai";
import { currentOwner } from "@/lib/auth";
import { DOMAIN_NAME, getExam } from "@/lib/exams";
import { ensureBank } from "@/lib/questions";
import { studySheet } from "@/lib/studysheet";

export const metadata: Metadata = { title: "Study sheet", robots: { index: false } };

export default async function StudySheetPage({ params }: PageProps<"/study/[exam]">) {
  const { exam: slug } = await params;
  const exam = getExam(slug);
  if (!exam) notFound();
  await ensureBank();
  const owner = await currentOwner();
  const topics = owner ? await studySheet(owner, slug) : [];
  const cards = await cachedCards(slug, topics.map((t) => ({ topic: t.topic, questions: t.bank })));
  const missed = topics.reduce((s, t) => s + t.missed, 0);
  const domains = exam.domains.map((d) => ({ ...d, topics: topics.filter((t) => t.domain === d.id) })).filter((d) => d.topics.length);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="eyebrow">{exam.code} · Study sheet</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Everything you&apos;ve studied</h1>
          <p className="mt-2 max-w-2xl text-soft">
            {topics.length
              ? `${topics.length} concept${topics.length === 1 ? "" : "s"} from your practice so far${missed ? `, ${missed} question${missed === 1 ? "" : "s"} still to fix` : ""}. Each session adds what it covered, weakest topics first.`
              : "Your sheet is empty. Answer some practice questions and the concepts they cover will appear here."}
          </p>
        </div>
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link className="btn-primary" href={`/study/${slug}/cheatsheet`}>One-page cheat sheet</Link>
            {missed > 0 && <Link className="btn-ghost" href={`/study/${slug}/cheatsheet?only=weak`}>Cheat sheet: weak topics</Link>}
          </div>
        )}
      </div>
      {!topics.length && <Link className="btn-primary mt-6" href={`/practice/${slug}`}>Start practising</Link>}

      {domains.map((d) => (
        <section key={d.id} className="mt-10">
          <h2 className="text-lg font-extrabold">{DOMAIN_NAME[d.id] ?? d.name}</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {d.topics.map((t) => {
              const card = cards.get(t.topic);
              return (
                <article key={t.topic} className="card flex flex-col p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-lg font-extrabold">{card?.title ?? t.topic}</h3>
                    <span className={`pill ${t.missed ? "bg-bad-soft text-bad" : "bg-ok-soft text-ok"}`}>
                      {t.seen} seen{t.missed ? ` · ${t.missed} to fix` : " · all correct"}
                    </span>
                  </div>
                  <div className="mt-3">
                    {card ? <ConceptCardBody card={card} /> : aiAvailable ? <CardLoader exam={slug} topic={t.topic} /> : <p className="text-sm text-muted">Concept notes appear here when the AI tutor is switched on.</p>}
                  </div>
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
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
