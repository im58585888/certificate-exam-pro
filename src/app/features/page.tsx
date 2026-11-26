import type { Metadata } from "next";
import Link from "next/link";
import { startQuizAction } from "../actions";
import { Breadcrumbs, breadcrumbLd } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { MiaPose } from "@/components/Mia";
import { AI_DAILY } from "@/lib/ai";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS, PASS_DAYS, PASS_PRICE_CENTS } from "@/lib/exams";
import { faqPage, graph } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Features: AI Tutor, Smart Practice & Mock Exams · Certificate Exam Pro" },
  description: "How Certificate Exam Pro helps you pass AWS exams: an AI tutor that explains any option, unseen-first practice, retrying only your mistakes, timed mock exams with analytics, and questions kept current with AWS changes.",
  alternates: { canonical: "/features" },
};

const PRICE = `$${(PASS_PRICE_CENTS / 100).toFixed(2)}`;

const GROUPS: { id: string; eyebrow: string; title: string; items: [string, string][] }[] = [
  {
    id: "ai-tutor", eyebrow: "Learn smarter", title: "Mia, an AI tutor on every question",
    items: [
      ["Break it down, without spoilers", "Before you answer, Mia explains what the question is really asking and what each requirement means, and draws the scenario, without saying which option is right."],
      ["An architecture diagram in every explanation", "Each answer explanation shows the real AWS setup in the scenario as a diagram, so you see how the services connect and why the right answer fits."],
      ["Ask why your answer is wrong", "After you answer, ask anything: why your choice fails, what the question is testing, or for a real-world example. No forum posts, no waiting for staff."],
      ["Your explanation style", "One tap for a simple explanation, a technical one with the exact settings and permissions, a diagram, or a similar question to try."],
      ["Mia reads your results", "After every session Mia reviews what you missed, recommends the topics to deep dive with cheat sheets and AWS docs to read, and gives a few tips to raise your score."],
      ["Visual study sheet", "Every topic you practise becomes a lesson: what it is, why it's useful, and an architecture diagram with each connection explained step by step."],
    ],
  },
  {
    id: "smart-practice", eyebrow: "Practise smarter", title: "Practice that measures understanding, not memory",
    items: [
      ["Unseen questions first", "Practice sets serve questions you haven't seen yet, then the ones you saw longest ago, so repeat familiarity doesn't inflate your score."],
      ["Retry only your mistakes", "Missed and flagged questions come back on a spaced schedule (1, 3, 7, 14 days), answered fresh with the answer hidden until you choose."],
      ["Flag as weak", "Flag any question you're unsure about, even if you got it right. Flagged questions get their own practice mode."],
      ["Pick your scope", "Any mix of exam domains, specific topics, one or more difficulty levels, and 5, 10, 20 or 30 questions. A Quick 5 fits a coffee break."],
      ["Timed mock exams", "65 questions weighted like the real exam, with the real time limit and a full scored review afterwards."],
      ["Pause anytime", "Save any session and finish later. A mock exam's clock stops while you're away."],
    ],
  },
  {
    id: "progress", eyebrow: "Measure smarter", title: "See where you stand",
    items: [
      ["Estimated readiness", "An estimated score on the 1,000-point scale, weighted by exam domain and favouring your recent answers, against the passing line."],
      ["Domain and topic analytics", "Mastery by exam domain and topic, accuracy trend, pace and a study streak, with your weakest topics first."],
      ["A big question bank", "500 original questions per exam, so you keep meeting new scenarios instead of repeating the same few."],
    ],
  },
  {
    id: "fresh", eyebrow: "Trust", title: "Questions kept current with AWS",
    items: [
      ["Checked against AWS changes", "We check every question against AWS's service lifecycle notices. When AWS retires, renames or closes a service, the question's explanation says so, with the date, the source and whether the exam guide still lists it."],
      ["Public changelog", "Every change to the question bank is listed on the What changed page."],
      ["Explanations for every option", "Each question explains why the right answer works and why every other option fails, with links to the AWS documentation."],
      ["One-click reporting", "Report a problem under any question; we review every report within 48 hours."],
    ],
  },
  {
    id: "anywhere", eyebrow: "Anywhere", title: "One account, one pass, every device",
    items: [
      ["Works in any browser", "Laptop, phone or tablet, with the same account and the same pass."],
      ["Progress follows you", "Every answer is saved as you go, so you can start on your laptop and finish on your phone."],
    ],
  },
];

const FAQ: [string, string][] = [
  ["Is the AI tutor included in the pass?", `Yes. Mia is included with every pass, up to ${AI_DAILY.paid} messages a day, and on the free trial (${AI_DAILY.free} a day).`],
  ["Can I retake only the questions I got wrong?", "Yes. Missed questions go into your review queue automatically and come back on a spaced schedule, answered fresh. You can also flag any question to practise it again."],
  ["How do I know my practice scores are real?", "Practice serves questions you haven't seen first, from a bank of 500 per exam, so your score reflects understanding rather than memory."],
  ["Can I study on my phone?", "Yes. The site works in any mobile browser with the same account and pass."],
];

export default function Features() {
  const crumbs = [{ name: "Home", href: "/" }, { name: "Features", href: "/features" }];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <JsonLd data={graph(breadcrumbLd(crumbs), faqPage(FAQ))} />
      <Breadcrumbs items={crumbs} />
      <div className="mt-4 flex items-end gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Don&apos;t just memorize AWS answers. Master the concepts.</h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-soft">
            Everything in Certificate Exam Pro is built around one idea: a practice score should mean you understand AWS, not that you&apos;ve seen the question before.
          </p>
          <nav className="mt-5 flex flex-wrap gap-2 text-sm" aria-label="On this page">
            {GROUPS.map((g) => <a key={g.id} href={`#${g.id}`} className="pill bg-surface-2 py-1.5 text-ink hover:bg-brand-soft">{g.title.split(",")[0]}</a>)}
          </nav>
        </div>
        <MiaPose pose="welcoming" height={180} alt="Mia, the AI tutor" className="hidden md:block" />
      </div>

      {GROUPS.map((g) => (
        <section key={g.id} id={g.id} className="mt-14 scroll-mt-20" aria-labelledby={`${g.id}-h`}>
          <p className="eyebrow">{g.eyebrow}</p>
          <h2 id={`${g.id}-h`} className="mt-1 text-2xl font-extrabold">{g.title}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {g.items.map(([t, b]) => (
              <div key={t} className="card p-5"><h3 className="font-extrabold">{t}</h3><p className="mt-1 text-[15px] leading-relaxed text-soft">{b}</p></div>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-14 rounded-2xl bg-brand-soft p-7 text-center">
        <h2 className="text-2xl font-extrabold">Try it free</h2>
        <p className="mt-1 text-soft">{FREE_TRIAL_QUESTIONS} questions per exam with Mia included. No account or card. Then {PRICE} per exam for {PASS_DAYS} days, never auto-renews.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {EXAM_LIST.map((e) => (
            <form key={e.slug} action={startQuizAction}>
              <input type="hidden" name="exam" value={e.slug} /><input type="hidden" name="mode" value="trial" />
              <button className="btn-primary">Try {e.code} free</button>
            </form>
          ))}
        </div>
        <p className="mt-3 text-sm"><Link href="/pricing" className="text-brand hover:underline">Pricing details</Link> · <Link href="/changelog" className="text-brand hover:underline">What changed</Link></p>
      </section>

      <section className="mt-12" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-2xl font-extrabold">FAQ</h2>
        <div className="mt-4 grid gap-2">
          {FAQ.map(([q, a]) => <details key={q} className="card p-4"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-2 text-[15px] text-soft">{a}</p></details>)}
        </div>
      </section>
    </div>
  );
}
