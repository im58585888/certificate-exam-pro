import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CardLoader, PrintButton } from "@/components/CardLoader";
import { ConceptCardBody } from "@/components/StudyCards";
import { aiAvailable, cachedCards } from "@/lib/ai";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { currentOwner, getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { loadNotebook } from "@/lib/notebook";
import { DOMAIN_SHORT, getExam } from "@/lib/exams";
import { ensureBank } from "@/lib/questions";
import { studySheet } from "@/lib/studysheet";

export const metadata: Metadata = { title: "Cheat sheet", robots: { index: false } };

const MAX_CARDS = 12;

export default async function CheatSheetPage({ params, searchParams }: PageProps<"/study/[exam]/cheatsheet">) {
  const { exam: slug } = await params;
  const weakOnly = (await searchParams).only === "weak";
  const exam = getExam(slug);
  if (!exam) notFound();
  await ensureBank();
  const user = await getUser();
  // Part of the exam pass, like the study sheet; the sheet's page explains how to unlock it.
  if (!user || !(await getAccess(user.id, slug)).active) redirect(`/study/${slug}`);
  const owner = await currentOwner();
  const all = owner ? await studySheet(owner, slug) : [];
  const notebook = await loadNotebook(user.id, slug);
  // Topics hidden on the study sheet stay off the cheat sheet too.
  const topics = (weakOnly ? all.filter((t) => t.missed > 0) : all).filter((t) => !notebook.prefs.get(t.topic)?.hidden).slice(0, MAX_CARDS);
  const weakTopics = new Set(all.filter((t) => t.missed > 0).map((t) => t.topic));
  const sectionName = new Map(notebook.sections.map((s) => [s.id, s.name]));
  const saved = notebook.items.filter((i) => (!i.topic || !notebook.prefs.get(i.topic)?.hidden) && (!weakOnly || (i.topic && weakTopics.has(i.topic))));
  const cards = await cachedCards(slug, topics.map((t) => ({ topic: t.topic, questions: t.bank })));
  const traps = topics.flatMap((t) => (cards.get(t.topic)?.traps.slice(0, 1) ?? []).map((trap) => ({ topic: t.topic, trap: `${trap.trap}? No: ${trap.truth}` }))).slice(0, 6);
  const practised = all.reduce((s, t) => s + t.seen, 0);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="cheatsheet mx-auto max-w-6xl px-4 py-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link className="text-sm font-bold text-brand" href={`/study/${slug}`}>← Back to study sheet</Link>
        <div className="flex gap-2">
          <Link className="btn-ghost" href={`/study/${slug}/cheatsheet${weakOnly ? "" : "?only=weak"}`}>{weakOnly ? "All topics" : "Weak topics only"}</Link>
          <PrintButton />
        </div>
      </div>

      <header className="mt-4 rounded-2xl bg-gradient-to-r from-brand to-brand-2 p-6 text-on-brand print:mt-0 print:rounded-none">
        <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-80">{exam.code} · {today}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{exam.shortName}: cheat sheet</h1>
        <p className="mt-1 opacity-90">{weakOnly ? "Your weakest topics" : "Your core concepts"}, from {practised} question{practised === 1 ? "" : "s"} practised.</p>
      </header>

      {!topics.length && !saved.length ? (
        <p className="mt-6 text-soft">Nothing here yet. {weakOnly ? "You have no open mistakes." : "Practise a few questions first."}</p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
          {topics.map((t, i) => {
            const card = cards.get(t.topic);
            return (
              <article key={t.topic} className="card break-inside-avoid p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-on-brand">{i + 1}</span>
                  <h2 className="font-extrabold leading-tight">{card?.title ?? t.topic}</h2>
                </div>
                <p className="mt-1 text-xs text-muted">{DOMAIN_SHORT[t.domain]}{t.missed ? ` · ${t.missed} missed` : ""}</p>
                <div className="mt-2">{card ? <ConceptCardBody card={card} compact /> : aiAvailable ? <CardLoader exam={slug} topic={t.topic} compact /> : null}</div>
              </article>
            );
          })}
        </div>
      )}

      {saved.length > 0 && (
        <section className="mt-4">
          <h2 className="font-extrabold">Your notes and saved items</h2>
          <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
            {saved.map((i) => (
              <article key={i.id} className={`card break-inside-avoid p-4 text-sm ${i.kind === "note" ? "bg-warn-soft" : ""}`}>
                <p className="text-xs font-bold text-muted">{i.kind === "note" ? "📝 Note" : "📌 Saved"} · {i.section_id ? sectionName.get(i.section_id) : i.topic}</p>
                {i.kind === "clip" && i.title && <h3 className="mt-1 font-extrabold leading-tight">{i.title}</h3>}
                <div className="mt-1.5">{i.kind === "note" ? <p className="whitespace-pre-wrap">{i.body}</p> : <ChatMarkdown text={i.body} />}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      {traps.length > 0 && (
        <section className="card mt-4 break-inside-avoid p-5">
          <h2 className="font-extrabold">Common exam traps</h2>
          <ul className="mt-2 grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
            {traps.map((t) => <li key={t.topic} className="rounded-lg bg-warn-soft px-3 py-2 text-warn"><b>{t.topic}:</b> {t.trap}</li>)}
          </ul>
        </section>
      )}

      <p className="mt-4 rounded-2xl border-[1.5px] border-brand px-5 py-3 text-sm break-inside-avoid">
        <b className="text-brand">Study rule:</b> understand the scenario first. Find the exact requirement, and the failure or bottleneck it describes, before you look at the options.
      </p>
    </div>
  );
}
