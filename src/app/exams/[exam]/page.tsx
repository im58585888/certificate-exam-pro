import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { startQuizAction } from "../../actions";
import { JsonLd } from "@/components/JsonLd";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS, PASS_DAYS, getExam } from "@/lib/exams";
import { GUIDES, GUIDE_UPDATED } from "@/lib/guides";
import { ensureBank, questionsFor } from "@/lib/questions";
import { FREE_PAGE_COUNT, SAMPLE_COUNT, samplesFor } from "@/lib/samples";
import { SampleQuestion } from "@/components/SampleQuestion";
import { CHANGELOG, fmtDate } from "@/lib/changelog";
import { COMPARISONS, SERVICES } from "@/lib/library";
import { PRICE, SITE_URL, examProduct, faqPage, graph } from "@/lib/seo";

// Public exam guide: the page people land on from search and AI answers. Answer first, facts in a table, real
// sample questions with full explanations, a study plan and a FAQ, then a way into the free trial.

const updated = new Date(`${GUIDE_UPDATED}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export const revalidate = 3600; // picks up admin edits to the sample questions within the hour

export async function generateMetadata({ params }: PageProps<"/exams/[exam]">): Promise<Metadata> {
  const exam = getExam((await params).exam);
  if (!exam) return {};
  const title = `${exam.code} Practice Exam & Study Guide (${new Date(GUIDE_UPDATED).getUTCFullYear()}): ${exam.name}`;
  const description = `${exam.name} (${exam.code}): exam format, passing score, domains, a study plan and ${SAMPLE_COUNT} free practice questions with full explanations.`;
  return { title: { absolute: title }, description, alternates: { canonical: `/exams/${exam.slug}` }, openGraph: { title, description, type: "article" } };
}

function TrialButton({ slug, label }: { slug: string; label: string }) {
  return (
    <form action={startQuizAction}>
      <input type="hidden" name="exam" value={slug} /><input type="hidden" name="mode" value="trial" />
      <button className="btn-primary">{label}</button>
    </form>
  );
}

export default async function ExamGuide({ params }: PageProps<"/exams/[exam]">) {
  await ensureBank();
  const { exam: slug } = await params;
  const exam = getExam(slug);
  const guide = GUIDES[slug];
  if (!exam || !guide) notFound();
  const bank = questionsFor(slug).length;
  const samples = samplesFor(slug);
  const others = EXAM_LIST.filter((e) => e.slug !== slug);
  const sheets = SERVICES.filter((sh) => slug in sh.exams);
  const comps = COMPARISONS.filter((c) => (slug === "aif-c01" ? c.category === "AI and ML" : slug === "saa-c03" ? c.category !== "AI and ML" : true));

  const facts: [string, string][] = [
    ["Questions", `${exam.examQuestions} (50 scored, 15 unscored)`],
    ["Time", `${exam.examMinutes} minutes`],
    ["Passing score", `${exam.passingScaled} out of 1,000`],
    ["Exam fee", guide.fee],
    ["Level", exam.level],
    ["Question types", guide.formats.split(".")[0]],
    ["Recommended experience", guide.experience.split(".")[0]],
    ["Valid for", "3 years"],
  ];

  const url = `${SITE_URL}/exams/${slug}`;
  const structured = graph(
    {
      "@type": "Article",
      headline: `${exam.code} Practice Exam & Study Guide`,
      about: exam.name,
      dateModified: GUIDE_UPDATED,
      url,
      author: { "@id": `${SITE_URL}/#org` },
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: `${exam.code} exam guide`, item: url },
      ],
    },
    faqPage(guide.faq),
    examProduct(exam, bank),
  );

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={structured} />

      {/* Answer first */}
      <p className="eyebrow">{exam.vendor} · {exam.code} · Exam guide · Updated {updated}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{exam.code} Practice Exam &amp; Study Guide</h1>
      <p className="mt-1 text-lg font-semibold text-soft">{exam.name}</p>
      <p className="mt-5 text-[17px] leading-relaxed">{guide.summary}</p>
      <p className="mt-3 text-soft"><b className="text-ink">Who it&apos;s for:</b> {guide.audience}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <TrialButton slug={slug} label={`Try ${FREE_TRIAL_QUESTIONS} free practice questions`} />
        <a href="#samples" className="btn-ghost">See sample questions below</a>
      </div>
      <p className="mt-2 text-sm text-muted">No account or payment card needed.</p>

      {/* Facts */}
      <section className="mt-12" aria-labelledby="facts">
        <h2 id="facts" className="text-2xl font-extrabold">{exam.code} exam at a glance</h2>
        <table className="mt-4 w-full overflow-hidden rounded-xl border border-line bg-surface text-left text-[15px]">
          <tbody>
            {facts.map(([k, v]) => (
              <tr key={k} className="border-b border-line last:border-0">
                <th scope="row" className="w-2/5 px-4 py-2.5 font-bold">{k}</th>
                <td className="px-4 py-2.5 text-soft">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-muted">
          From the <a className="text-brand hover:underline" href={guide.officialUrl} rel="noopener" target="_blank">official AWS exam page</a>. Fees vary by country; check when you book.
        </p>
      </section>

      {/* Domains */}
      <section className="mt-12" aria-labelledby="domains">
        <h2 id="domains" className="text-2xl font-extrabold">What the {exam.code} exam covers</h2>
        <p className="mt-2 text-soft">The exam is split into {exam.domains.length} domains. The percentage is each domain&apos;s share of the scored questions.</p>
        <div className="mt-5 grid gap-3">
          {exam.domains.map((d) => (
            <div key={d.id} className="card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-extrabold">{d.name}</h3>
                <span className="shrink-0 font-extrabold text-brand">{Math.round(d.weight * 100)}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-surface-2" aria-hidden><div className="h-full rounded-full bg-brand" style={{ width: `${d.weight * 100 / 0.4}%`, maxWidth: "100%" }} /></div>
              <p className="mt-3 text-[15px] text-soft">{guide.domains[d.id]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Samples */}
      <section id="samples" className="mt-12 scroll-mt-20" aria-labelledby="samples-title">
        <h2 id="samples-title" className="text-2xl font-extrabold">{samples.length} free {exam.code} practice questions</h2>
        <p className="mt-2 text-soft">Original questions in the style of the real exam. Pick your answer, then open the explanation to see why each option is right or wrong.</p>
        <ol className="mt-5 grid gap-4">
          {samples.map((q, i) => <SampleQuestion key={q.id} q={q} n={i + 1} exam={slug} />)}
        </ol>
        <p className="mt-4"><Link href={`/exams/${slug}/free-questions`} className="font-bold text-brand hover:underline">See {FREE_PAGE_COUNT} more free {exam.code} questions, grouped by domain →</Link></p>
        <div className="card mt-5 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-extrabold">Want more? There are {bank} {exam.code} questions.</p>
            <p className="text-soft">Try {FREE_TRIAL_QUESTIONS} more free, with Mia, the AI tutor, to break down anything you&apos;re stuck on.</p>
          </div>
          <TrialButton slug={slug} label="Start free practice" />
        </div>
      </section>

      {/* Library */}
      <section className="mt-12" aria-labelledby="sheets">
        <h2 id="sheets" className="text-2xl font-extrabold">AWS services to know for {exam.code}</h2>
        <p className="mt-2 text-soft">Cheat sheets with a diagram, the exam&apos;s decision rules and practice questions for each service.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sheets.map((sh) => (
            <Link key={sh.slug} href={`/aws/${sh.slug}`} className="card p-4 hover:border-brand">
              <span className="block font-extrabold">{sh.service}</span>
              <span className="mt-1 block text-sm text-soft">{sh.exams[slug as keyof typeof sh.exams]}</span>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-[15px]"><b>Commonly confused:</b>{" "}
          {comps.map((c, i) => <span key={c.slug}>{i > 0 && " · "}<Link href={`/aws/compare/${c.slug}`} className="text-brand hover:underline">{c.items.join(" vs ")}</Link></span>)}
        </p>
        <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-soft">
          Our {exam.code} questions were last checked against AWS service changes on {fmtDate(CHANGELOG[0].date)}. Questions that mention a retired or renamed service say so, with the date and source. <Link href="/changelog" className="font-bold text-brand hover:underline">See what changed</Link>
        </p>
      </section>

      {/* Plan */}
      <section className="mt-12" aria-labelledby="plan">
        <h2 id="plan" className="text-2xl font-extrabold">How to study for {exam.code}: a {guide.studyWeeks} plan</h2>
        <ol className="mt-5 grid gap-3">
          {guide.plan.map((p, i) => (
            <li key={p.title} className="flex gap-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">{i + 1}</span>
              <div><h3 className="font-extrabold">{p.title}</h3><p className="mt-0.5 text-[15px] text-soft">{p.body}</p></div>
            </li>
          ))}
        </ol>
      </section>

      {/* Why here */}
      <section className="mt-12 rounded-2xl bg-brand-soft p-6" aria-labelledby="why">
        <h2 id="why" className="text-xl font-extrabold">Practice {exam.code} on Certificate Exam Pro</h2>
        <ul className="mt-3 grid gap-1.5 text-[15px]">
          <li>✓ {bank} original questions that follow the official {exam.code} exam guide</li>
          <li>✓ A detailed explanation for every option, right and wrong</li>
          <li>✓ Mia, an AI tutor that breaks questions down without giving the answer away</li>
          <li>✓ Timed {exam.examQuestions}-question mock exams with an estimated score</li>
          <li>✓ Retry only your mistakes, unseen questions first, and a readiness check built on first-attempt scores</li>
          <li>✓ Questions checked against AWS service changes, with a public <Link href="/changelog" className="font-bold text-brand hover:underline">changelog</Link></li>
        </ul>
        <p className="mt-4 text-[15px]"><b>${PRICE}</b> for {PASS_DAYS} days. One payment, no auto-renewal. <Link href="/pricing" className="font-bold text-brand hover:underline">See pricing</Link></p>
      </section>

      {/* FAQ */}
      <section className="mt-12" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-extrabold">{exam.code} FAQ</h2>
        <div className="mt-4 grid gap-2">
          {guide.faq.map(([q, a]) => (
            <details key={q} className="card p-4">
              <summary className="cursor-pointer font-bold">{q}</summary>
              <p className="mt-2 text-[15px] text-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Other exams */}
      <nav className="mt-12" aria-label="Other exam guides">
        <h2 className="text-lg font-extrabold">Other AWS exam guides</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {others.map((e) => (
            <Link key={e.slug} href={`/exams/${e.slug}`} className="card p-4 hover:border-brand">
              <span className="text-xs font-bold text-muted">{e.code}</span>
              <span className="block font-extrabold">{e.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </article>
  );
}
