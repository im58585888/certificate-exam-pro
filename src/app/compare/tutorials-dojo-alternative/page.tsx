import type { Metadata } from "next";
import Link from "next/link";
import { startQuizAction } from "@/app/actions";
import { Breadcrumbs, breadcrumbLd } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { fmtDate } from "@/lib/changelog";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS, PASS_DAYS, PASS_PRICE_CENTS } from "@/lib/exams";
import { faqPage, graph } from "@/lib/seo";

// An honest comparison for people searching for an alternative. Rules: only facts we can source or that describe our
// own product, dated; say where the other site is the better choice; no knocking.
const CHECKED = "2026-11-26";
const PRICE = `$${(PASS_PRICE_CENTS / 100).toFixed(2)}`;

export const metadata: Metadata = {
  title: { absolute: "Tutorials Dojo Alternative for AWS Exams (2026): An Honest Comparison" },
  description: "Looking for a Tutorials Dojo alternative for SAA-C03, CLF-C02 or AIF-C01? An honest, dated comparison: when Tutorials Dojo is the better pick, and when Certificate Exam Pro's AI tutor, unseen-first practice and readiness check fit better.",
  alternates: { canonical: "/compare/tutorials-dojo-alternative" },
};

const FAQ: [string, string][] = [
  ["Is Certificate Exam Pro affiliated with Tutorials Dojo?", "No. We're an independent study service, not affiliated with Tutorials Dojo or with AWS. Tutorials Dojo is a trademark of its owner."],
  ["Can I use both?", "Yes, and many learners combine resources. If you already have another practice set, our free trial and free practice questions are a quick way to test yourself on questions you haven't seen."],
  ["Which exams does Certificate Exam Pro cover?", "AWS Certified Cloud Practitioner (CLF-C02), AI Practitioner (AIF-C01) and Solutions Architect – Associate (SAA-C03), with 500 original questions each."],
];

const OURS: [string, string][] = [
  ["Ask the AI tutor about any option", "Mia explains why an answer is right or wrong right away: simply, technically or as a diagram. You don't need to post in a forum or switch to a separate chatbot."],
  ["Retry only the questions you missed", "Missed and flagged questions come back on a spaced schedule and are answered fresh, without the answer showing."],
  ["Unseen questions first", "Practice sets serve questions you haven't seen, so repeat familiarity doesn't inflate your score."],
  ["Readiness judged on first attempts", "The dashboard checks first-attempt accuracy, every domain, a recent timed mock exam and pace, and warns you about a memorization gap."],
  ["Real pause", "Save any session and finish later; a mock exam's clock stops while you're away."],
  ["Dated AWS status notes", "Questions that mention a retired, renamed or closed AWS service say so, with the date and source, and every bank change is public."],
];

export default function TutorialsDojoAlternative() {
  const crumbs = [{ name: "Home", href: "/" }, { name: "Tutorials Dojo alternative", href: "/compare/tutorials-dojo-alternative" }];
  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={graph(breadcrumbLd(crumbs), faqPage(FAQ), { "@type": "Article", headline: "Tutorials Dojo alternative for AWS exams", dateModified: CHECKED, datePublished: CHECKED })} />
      <Breadcrumbs items={crumbs} />
      <p className="eyebrow mt-5">Comparison · Checked {fmtDate(CHECKED)}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Looking for a Tutorials Dojo alternative?</h1>
      <div className="mt-6 rounded-2xl border-l-4 border-brand bg-brand-soft p-5">
        <p className="eyebrow">Quick answer</p>
        <p className="mt-2 text-[17px] leading-relaxed">
          Tutorials Dojo is a well-established, widely recommended provider with a huge catalog of practice exams, cheat sheets, video courses and eBooks across AWS, Azure, Google Cloud and more.
          Certificate Exam Pro is smaller and focused on three AWS exams. It&apos;s built around an AI tutor you can question about any option, practice that serves unseen questions first,
          and a readiness check based on first attempts. If you&apos;re preparing for CLF-C02, AIF-C01 or SAA-C03 and want those things, try us free; otherwise Tutorials Dojo is a strong choice.
        </p>
      </div>

      <section className="mt-12" aria-labelledby="td-better">
        <h2 id="td-better" className="text-2xl font-extrabold">When Tutorials Dojo is the better pick</h2>
        <ul className="mt-4 grid list-disc gap-1.5 pl-5 leading-relaxed">
          <li>You&apos;re studying for an exam we don&apos;t cover (Professional and Specialty AWS exams, Azure, Google Cloud, Kubernetes and more).</li>
          <li>You want video courses, eBooks or hands-on labs alongside practice exams.</li>
          <li>You value a long track record: Tutorials Dojo has helped a very large number of learners and is a common community recommendation.</li>
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="us-better">
        <h2 id="us-better" className="text-2xl font-extrabold">When Certificate Exam Pro fits better</h2>
        <p className="mt-2 text-soft">
          Learners on Tutorials Dojo&apos;s own forum have asked for things like retaking only the questions they got wrong (<a className="text-brand hover:underline" href="https://portal.tutorialsdojo.com/forums/discussion/retake-practice-exam-with-only-incorrect-questions/" target="_blank" rel="noopener nofollow">thread</a>) and a pause that stops the clock (<a className="text-brand hover:underline" href="https://portal.tutorialsdojo.com/forums/discussion/got-any-ideas-on-how-improve-the-tutorials-dojo-portal/" target="_blank" rel="noopener nofollow">thread</a>).
          Features change, so check their site for the current state. Here&apos;s what Certificate Exam Pro does today:
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {OURS.map(([t, b]) => <div key={t} className="card p-5"><h3 className="font-extrabold">{t}</h3><p className="mt-1 text-[15px] text-soft">{b}</p></div>)}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="price">
        <h2 id="price" className="text-2xl font-extrabold">Price and access</h2>
        <p className="mt-2 leading-relaxed">
          Certificate Exam Pro: {PRICE} per exam for {PASS_DAYS} days, a one-time payment that never auto-renews, AI tutor included, on every device. {FREE_TRIAL_QUESTIONS} questions per exam free with no account.
          For Tutorials Dojo&apos;s current prices and access periods, see their store.
        </p>
      </section>

      <section className="mt-10 rounded-2xl bg-brand-soft p-7">
        <h2 className="text-xl font-extrabold">See for yourself in 10 minutes</h2>
        <p className="mt-1 text-soft">Try {FREE_TRIAL_QUESTIONS} questions free, then ask Mia about one you got wrong. Or browse <Link href="/exams/saa-c03/free-questions" className="text-brand hover:underline">free SAA-C03 questions with answers</Link>.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAM_LIST.map((e) => (
            <form key={e.slug} action={startQuizAction}>
              <input type="hidden" name="exam" value={e.slug} /><input type="hidden" name="mode" value="trial" />
              <button className="btn-primary">Try {e.code} free</button>
            </form>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-2xl font-extrabold">FAQ</h2>
        <div className="mt-4 grid gap-2">
          {FAQ.map(([q, a]) => <details key={q} className="card p-4"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-2 text-[15px] text-soft">{a}</p></details>)}
        </div>
      </section>
      <p className="mt-8 text-xs text-muted">Tutorials Dojo is a trademark of its owner, used here only to identify the product being compared. Information about Tutorials Dojo comes from its public website and forum as of {fmtDate(CHECKED)}.</p>
    </article>
  );
}
