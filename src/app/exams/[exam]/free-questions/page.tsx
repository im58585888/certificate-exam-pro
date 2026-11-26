import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { startQuizAction } from "@/app/actions";
import { Breadcrumbs, breadcrumbLd } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { MiaPose } from "@/components/Mia";
import { SampleQuestion } from "@/components/SampleQuestion";
import { CHANGELOG, fmtDate } from "@/lib/changelog";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS, getExam } from "@/lib/exams";
import { SERVICES } from "@/lib/library";
import { ensureBank, questionsFor } from "@/lib/questions";
import { FREE_PAGE_COUNT, freePageSamples } from "@/lib/samples";
import { SITE_URL, graph } from "@/lib/seo";

export const revalidate = 3600;
export const generateStaticParams = () => EXAM_LIST.map((e) => ({ exam: e.slug }));

const year = new Date().getUTCFullYear();

export async function generateMetadata({ params }: PageProps<"/exams/[exam]/free-questions">): Promise<Metadata> {
  const exam = getExam((await params).exam);
  if (!exam) return {};
  const title = `${FREE_PAGE_COUNT} Free ${exam.code} Practice Questions with Answers (${year})`;
  const description = `${FREE_PAGE_COUNT} free ${exam.name} (${exam.code}) practice questions with answers and a full explanation of every option, grouped by exam domain. No sign-up needed.`;
  return { title: { absolute: title }, description, alternates: { canonical: `/exams/${exam.slug}/free-questions` }, openGraph: { title, description, type: "article" } };
}

export default async function FreeQuestions({ params }: PageProps<"/exams/[exam]/free-questions">) {
  await ensureBank();
  const { exam: slug } = await params;
  const exam = getExam(slug);
  if (!exam) notFound();
  const qs = freePageSamples(slug);
  const bank = questionsFor(slug).length;
  const crumbs = [{ name: "Home", href: "/" }, { name: `${exam.code} exam guide`, href: `/exams/${slug}` }, { name: "Free practice questions", href: `/exams/${slug}/free-questions` }];
  const sheets = SERVICES.filter((s) => slug in s.exams);
  let n = 0;

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={graph(breadcrumbLd(crumbs), { "@type": "WebPage", name: `${exam.code} free practice questions`, url: `${SITE_URL}/exams/${slug}/free-questions`, dateModified: CHANGELOG[0].date })} />
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{qs.length} free {exam.code} practice questions with answers</h1>
      <p className="mt-1 text-lg font-semibold text-soft">{exam.name}</p>
      <p className="mt-4 text-[17px] leading-relaxed">
        Original questions written to the official {exam.code} exam guide, grouped by exam domain. Try each one, then open the explanation: it shows why the answer is right and why every other option is wrong.
      </p>
      <p className="mt-2 text-sm text-muted">Question bank checked against AWS service changes on {fmtDate(CHANGELOG[0].date)} · <Link href="/changelog" className="underline">What changed</Link></p>

      {exam.domains.map((d) => {
        const group = qs.filter((q) => q.domain === d.id);
        if (!group.length) return null;
        return (
          <section key={d.id} className="mt-10" aria-labelledby={`d-${d.id}`}>
            <h2 id={`d-${d.id}`} className="text-xl font-extrabold">{d.name} <span className="text-base font-bold text-muted">({Math.round(d.weight * 100)}% of the exam)</span></h2>
            <ol className="mt-4 grid gap-4">{group.map((q) => <SampleQuestion key={q.id} q={q} n={++n} exam={slug} />)}</ol>
          </section>
        );
      })}

      <aside className="mt-10 flex flex-col gap-4 rounded-2xl bg-brand-soft p-6 sm:flex-row sm:items-center">
        <MiaPose pose="thinking" height={110} alt="Mia, the AI tutor" />
        <div className="flex-1">
          <p className="text-lg font-extrabold">Practise the next {FREE_TRIAL_QUESTIONS} free, with Mia the AI tutor</p>
          <p className="mt-1 text-soft">Different questions from these, drawn from {bank}. Stuck? Mia breaks the question down without giving the answer away, and after you answer you can ask why your choice was wrong.</p>
          <form action={startQuizAction} className="mt-3">
            <input type="hidden" name="exam" value={slug} /><input type="hidden" name="mode" value="trial" />
            <button className="btn-primary">Start {FREE_TRIAL_QUESTIONS} free questions</button>
          </form>
          <p className="mt-2 text-sm text-muted">No account or card needed.</p>
        </div>
      </aside>

      {sheets.length > 0 && (
        <nav className="mt-12" aria-label="Cheat sheets">
          <h2 className="text-lg font-extrabold">{exam.code} cheat sheets</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {sheets.map((s) => <Link key={s.slug} href={`/aws/${s.slug}`} className="pill bg-surface-2 py-1.5 text-sm text-ink hover:bg-brand-soft">{s.service}</Link>)}
            <Link href="/aws" className="pill bg-surface-2 py-1.5 text-sm text-brand">All cheat sheets →</Link>
          </div>
        </nav>
      )}
    </article>
  );
}
