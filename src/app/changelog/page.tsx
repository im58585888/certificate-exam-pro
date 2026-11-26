import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, breadcrumbLd } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { CHANGELOG, fmtDate } from "@/lib/changelog";
import { EXAMS } from "@/lib/exams";
import { LIFECYCLE_CHECKED, allStatusNotes, statusNotesFor } from "@/lib/lifecycle";
import { ensureBank, questionsFor } from "@/lib/questions";
import { SITE_URL, graph } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "What Changed: Question Updates and AWS Service Changes · Certificate Exam Pro" },
  description: "Every change to our AWS practice questions, and every AWS service our questions mention that AWS has retired, renamed or closed to new customers, with dates and sources.",
  alternates: { canonical: "/changelog" },
};

const crumbs = [{ name: "Home", href: "/" }, { name: "What changed", href: "/changelog" }];

export default async function Changelog() {
  await ensureBank();
  const notes = allStatusNotes();
  const affected = new Map<string, number>();
  for (const slug of Object.keys(EXAMS)) for (const q of questionsFor(slug)) for (const n of statusNotesFor(q, slug)) affected.set(n.id, (affected.get(n.id) ?? 0) + 1);

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={graph(breadcrumbLd(crumbs), { "@type": "WebPage", name: "What changed", url: `${SITE_URL}/changelog`, dateModified: CHANGELOG[0].date })} />
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">What changed</h1>
      <p className="mt-4 text-[17px] leading-relaxed">
        AWS retires and renames services faster than it updates its exam guides, and outdated questions are the most common complaint about AWS practice exams.
        So we keep a public record: every change we make to our questions, and every AWS service change that affects them.
      </p>
      <p className="mt-3 text-soft">
        Last checked against AWS&apos;s lifecycle notices: <b className="text-ink">{fmtDate(LIFECYCLE_CHECKED)}</b>. Found a problem?
        Use <b className="text-ink">Report a problem</b> under any question; we review every report within 48 hours.
      </p>

      <section className="mt-10" aria-labelledby="updates">
        <h2 id="updates" className="text-2xl font-extrabold">Question bank updates</h2>
        <ol className="mt-4 grid gap-3">
          {CHANGELOG.map((e) => (
            <li key={`${e.date}-${e.title}`} className="card p-5">
              <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
                <time dateTime={e.date}>{fmtDate(e.date)}</time>
                {e.exams.map((x) => <span key={x} className="pill bg-brand-soft text-brand">{EXAMS[x]?.code}</span>)}
              </p>
              <h3 className="mt-2 font-extrabold">{e.title}</h3>
              <p className="mt-1 text-[15px] text-soft">{e.body}</p>
              {e.questionIds && <p className="mt-2 text-xs text-muted">Questions: {e.questionIds.join(", ")}</p>}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="aws">
        <h2 id="aws" className="text-2xl font-extrabold">AWS service changes our questions account for</h2>
        <p className="mt-2 text-soft">When a question mentions one of these services, its explanation shows the note below, including whether the current exam guide still lists the service.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] bg-surface text-left text-[15px]">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-2.5">Service</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">What changed</th><th className="px-4 py-2.5 text-right">Questions</th></tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id} className="border-t border-line align-top">
                  <th scope="row" className="px-4 py-3 font-bold">{n.service}</th>
                  <td className="px-4 py-3"><span className="pill bg-warn-soft text-warn">{n.label}</span></td>
                  <td className="px-4 py-3 text-soft">{n.text} <a href={n.source.url} className="text-brand hover:underline" target="_blank" rel="noopener">Source</a></td>
                  <td className="px-4 py-3 text-right font-bold">{affected.get(n.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-10 text-soft">
        Want to see how this works? <Link href="/exams/saa-c03/free-questions" className="font-bold text-brand hover:underline">Try free practice questions</Link> with full explanations.
      </p>
    </article>
  );
}
