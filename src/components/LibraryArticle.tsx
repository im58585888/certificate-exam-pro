import Link from "next/link";
import type { ReactNode } from "react";
import { startQuizAction } from "@/app/actions";
import { fmtDate } from "@/lib/changelog";
import { EXAMS, FREE_TRIAL_QUESTIONS } from "@/lib/exams";
import { getPage, hrefOf, labelOf, type LibPage } from "@/lib/library";
import type { Section } from "@/lib/library/types";
import { librarySamples } from "@/lib/samples";
import { SITE_URL, faqPage, graph } from "@/lib/seo";
import { ArchFigure } from "./ArchDiagram";
import { Breadcrumbs, breadcrumbLd, type Crumb } from "./Breadcrumbs";
import { JsonLd } from "./JsonLd";
import { SampleQuestion } from "./SampleQuestion";

// One template for every library page (cheat sheet, comparison, guide): direct answer first, contents, tables, a
// diagram with step explanations, exam rules, sample questions with explanations, FAQ and official references.

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[520px] bg-surface text-left text-[15px]">
        <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
          <tr>{head.map((h, i) => <th key={i} scope="col" className="px-4 py-2.5">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line align-top">
              {r.map((c, j) => (j === 0 ? <th key={j} scope="row" className="px-4 py-2.5 font-bold">{c}</th> : <td key={j} className="px-4 py-2.5 text-soft">{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBlock({ s }: { s: Section }) {
  return (
    <section id={s.id} className="mt-12 scroll-mt-20" aria-labelledby={`${s.id}-h`}>
      <h2 id={`${s.id}-h`} className="text-2xl font-extrabold">{s.heading}</h2>
      {s.lead && <p className="mt-3 text-[17px] leading-relaxed">{s.lead}</p>}
      {s.paragraphs?.map((p, i) => <p key={i} className="mt-3 leading-relaxed text-soft">{p}</p>)}
      {s.bullets && <ul className="mt-3 grid list-disc gap-1.5 pl-5 leading-relaxed">{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
      {s.table && <Table {...s.table} />}
    </section>
  );
}

function TrialButton({ exam, label }: { exam: string; label: string }) {
  return (
    <form action={startQuizAction}>
      <input type="hidden" name="exam" value={exam} /><input type="hidden" name="mode" value="trial" />
      <button className="btn-primary">{label}</button>
    </form>
  );
}

export function crumbsFor(p: LibPage): Crumb[] {
  const home = { name: "Home", href: "/" };
  if (p.kind === "guide") return [home, { name: "Guides", href: "/guides" }, { name: p.title, href: hrefOf(p) }];
  const hub = { name: "AWS cheat sheets", href: "/aws" };
  return [home, hub, { name: p.kind === "service" ? p.service : p.title, href: hrefOf(p) }];
}

export function LibraryArticle({ page: p, children }: { page: LibPage; children?: ReactNode }) {
  const crumbs = crumbsFor(p);
  const samples = librarySamples(p);
  const examSlugs = p.kind === "service" ? (Object.keys(p.exams) as string[]) : p.kind === "guide" ? p.exams : [...new Set(samples.map((q) => q.exam))];
  const primaryExam = samples[0]?.exam ?? examSlugs[0] ?? "saa-c03";
  const related = p.related.map(getPage).filter((x): x is LibPage => !!x);
  const kindLabel = p.kind === "service" ? "Cheat sheet" : p.kind === "compare" ? "Comparison" : "Guide";

  const toc: { id: string; label: string }[] = [
    ...(p.kind === "compare" ? [{ id: "side-by-side", label: "Side by side" }, { id: "pick", label: "Which to choose" }] : []),
    ...p.sections.map((s) => ({ id: s.id, label: s.heading })),
    ...(p.diagram ? [{ id: "diagram", label: "How it fits together" }] : []),
    ...(p.kind === "service" && Object.keys(p.exams).length ? [{ id: "exams", label: "What the exams ask" }] : []),
    ...(p.rules.length ? [{ id: "rules", label: "Exam decision rules" }] : []),
    ...(samples.length ? [{ id: "practice", label: "Practice questions" }] : []),
    { id: "faq", label: "FAQ" },
  ];

  const url = `${SITE_URL}${hrefOf(p)}`;
  const ld = graph(
    {
      "@type": "Article",
      headline: p.title,
      description: p.description,
      datePublished: p.published,
      dateModified: p.reviewed,
      url,
      mainEntityOfPage: url,
      author: { "@id": `${SITE_URL}/#org` },
      publisher: { "@id": `${SITE_URL}/#org` },
      ...(p.kind === "service" ? { about: { "@type": "Thing", name: p.service } } : {}),
      citation: p.references.map((r) => r.url),
    },
    breadcrumbLd(crumbs),
    faqPage(p.faq),
  );

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbs} />
      <p className="eyebrow mt-5">{kindLabel}{p.kind !== "guide" ? ` · ${p.category}` : ""} · Reviewed {fmtDate(p.reviewed)}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{p.title}</h1>
      <p className="mt-1 text-sm text-muted">By the Certificate Exam Pro team · Checked against the AWS documentation linked below</p>

      <div className="mt-6 rounded-2xl border-l-4 border-brand bg-brand-soft p-5">
        <p className="eyebrow">Quick answer</p>
        <p className="mt-2 text-[17px] leading-relaxed">{p.answer}</p>
      </div>

      <nav aria-label="On this page" className="card mt-6 p-5">
        <p className="eyebrow">On this page</p>
        <ol className="mt-2 grid gap-1 text-[15px] sm:grid-cols-2">
          {toc.map((t, i) => <li key={t.id}><a href={`#${t.id}`} className="text-brand hover:underline">{i + 1}. {t.label}</a></li>)}
        </ol>
      </nav>

      {p.kind === "compare" && (
        <>
          <section id="side-by-side" className="mt-12 scroll-mt-20" aria-labelledby="sbs-h">
            <h2 id="sbs-h" className="text-2xl font-extrabold">{p.items.join(" vs ")}: side by side</h2>
            <Table {...p.table} />
          </section>
          <section id="pick" className="mt-12 scroll-mt-20" aria-labelledby="pick-h">
            <h2 id="pick-h" className="text-2xl font-extrabold">Which should you choose?</h2>
            <div className="mt-4 grid gap-3">
              {p.pick.map((x) => (
                <div key={x.item} className="card p-4"><p className="font-extrabold">Choose {x.item} when…</p><p className="mt-1 text-soft">{x.when}</p></div>
              ))}
            </div>
          </section>
        </>
      )}

      {p.sections.map((s) => <SectionBlock key={s.id} s={s} />)}
      {children}

      {p.diagram && (
        <section id="diagram" className="mt-12 scroll-mt-20" aria-labelledby="diagram-h">
          <h2 id="diagram-h" className="text-2xl font-extrabold">How it fits together</h2>
          <p className="mt-2 text-soft">{p.diagram.caption}. Select a numbered step to see exactly how each connection works.</p>
          <div className="mt-4"><ArchFigure diagram={p.diagram} /></div>
        </section>
      )}

      {p.kind === "service" && Object.keys(p.exams).length > 0 && (
        <section id="exams" className="mt-12 scroll-mt-20" aria-labelledby="exams-h">
          <h2 id="exams-h" className="text-2xl font-extrabold">What the exams ask about {p.service}</h2>
          <div className="mt-4 grid gap-3">
            {Object.entries(p.exams).map(([slug, text]) => (
              <div key={slug} className="card p-4">
                <Link href={`/exams/${slug}`} className="font-extrabold text-brand hover:underline">{EXAMS[slug]?.code}: {EXAMS[slug]?.shortName}</Link>
                <p className="mt-1 text-soft">{text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {p.rules.length > 0 && (
        <section id="rules" className="mt-12 scroll-mt-20" aria-labelledby="rules-h">
          <h2 id="rules-h" className="text-2xl font-extrabold">Exam decision rules</h2>
          <p className="mt-2 text-soft">When a question&apos;s wording matches the left side, the answer is usually the right side.</p>
          <ul className="mt-4 grid gap-2">
            {p.rules.map((r) => <li key={r} className="rounded-xl border border-line bg-surface px-4 py-3 text-[15px]">{r}</li>)}
          </ul>
        </section>
      )}

      {samples.length > 0 && (
        <section id="practice" className="mt-12 scroll-mt-20" aria-labelledby="practice-h">
          <h2 id="practice-h" className="text-2xl font-extrabold">Practice questions</h2>
          <p className="mt-2 text-soft">Original questions from our bank in the style of the real exams. Pick an answer, then open the explanation to see why each option is right or wrong.</p>
          <ol className="mt-5 grid gap-4">{samples.map((q, i) => <SampleQuestion key={q.id} q={q} n={i + 1} exam={q.exam} showExam />)}</ol>
        </section>
      )}

      <aside className="card mt-8 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-extrabold">Practise with fresh questions, not memorized ones</p>
          <p className="text-soft">Try {FREE_TRIAL_QUESTIONS} free {EXAMS[primaryExam]?.code} questions. Stuck? Ask Mia, the AI tutor, why an option is wrong.</p>
        </div>
        <TrialButton exam={primaryExam} label="Start free practice" />
      </aside>

      <section id="faq" className="mt-12 scroll-mt-20" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-2xl font-extrabold">FAQ</h2>
        <div className="mt-4 grid gap-2">
          {p.faq.map(([q, a]) => (
            <details key={q} className="card p-4"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-2 text-[15px] text-soft">{a}</p></details>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="refs-h">
        <h2 id="refs-h" className="text-lg font-extrabold">Official AWS references</h2>
        <ul className="mt-2 grid list-disc gap-1 pl-5 text-[15px]">
          {p.references.map((r) => <li key={r.url}><a href={r.url} className="text-brand hover:underline" target="_blank" rel="noopener">{r.title}</a></li>)}
        </ul>
        <p className="mt-3 text-sm text-muted">Reviewed {fmtDate(p.reviewed)}. Spot something out of date? <Link href="/contact" className="underline">Tell us</Link> and see <Link href="/changelog" className="underline">what changed</Link>.</p>
      </section>

      {related.length > 0 && (
        <nav className="mt-12" aria-label="Related">
          <h2 className="text-lg font-extrabold">Related</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link key={r.slug} href={hrefOf(r)} className="card p-4 hover:border-brand">
                <span className="text-xs font-bold text-muted">{r.kind === "service" ? "Cheat sheet" : r.kind === "compare" ? "Comparison" : "Guide"}</span>
                <span className="block font-extrabold">{labelOf(r)}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </article>
  );
}
