import Link from "next/link";
import { startQuizAction } from "./actions";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS, PASS_DAYS, PASS_PRICE_CENTS } from "@/lib/exams";
import { ensureBank, questionsFor } from "@/lib/questions";

const PRICE = `$${(PASS_PRICE_CENTS / 100).toFixed(2)}`;

function TrialButton({ exam, className = "btn-primary w-full" }: { exam: string; className?: string }) {
  return (
    <form action={startQuizAction}>
      <input type="hidden" name="exam" value={exam} />
      <input type="hidden" name="mode" value="trial" />
      <button className={className}>Try {FREE_TRIAL_QUESTIONS} free questions</button>
    </form>
  );
}

const FEATURES = [
  {
    title: "Explanations that actually teach",
    body: "Every option, right or wrong, comes with the reasoning behind it: why the answer fits the requirement, why each distractor is a trap, the core concept, and an exam tip.",
  },
  {
    title: "Practice that remembers your mistakes",
    body: "Missed and flagged questions come back on a spaced schedule (1, 3, 7, 14 days) and your weakest topics get new questions, so you fix gaps instead of memorizing answers.",
  },
  {
    title: "Analytics that show readiness",
    body: "Track mastery by exam domain and topic, accuracy over time, pace per question, and an estimated readiness score weighted like the real exam.",
  },
];

const FAQ = [
  ["Which exams are available?", `${EXAM_LIST.map((e) => `${e.name} (${e.code})`).join(" and ")}. More AWS certifications are on the way.`],
  ["Are these real exam questions?", "No. Every question is original, written against the official AWS exam guides in the same scenario style as the real tests. Real exam questions are confidential, and memorizing them doesn't teach you anything."],
  ["What do I get for free?", `${FREE_TRIAL_QUESTIONS} full practice questions on each exam, with complete explanations. No account or card needed.`],
  ["How does the pass work?", `One ${PRICE} payment unlocks one exam for ${PASS_DAYS} days: unlimited practice, mock exams, review and analytics for that exam. Studying for both? Buy a pass for each.`],
  ["Is the pass a subscription?", `No. It's a one-time payment that doesn't renew automatically. Buy again whenever you want more time, and your history is kept.`],
];

export default async function Home() {
  await ensureBank();
  const exams = EXAM_LIST.map((exam) => ({ exam, bank: questionsFor(exam.slug).length }));
  const total = exams.reduce((s, e) => s + e.bank, 0);
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            {EXAM_LIST.map((e) => <span key={e.slug} className="pill bg-brand-soft text-brand">AWS {e.shortName} · {e.code}</span>)}
          </div>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-[3.4rem]">
            Pass your AWS certification by understanding <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">every answer</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-soft">
            Scenario-based practice questions in the real exams&apos; style, a detailed explanation for every option, and adaptive review that
            keeps bringing back the topics you miss.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#exams" className="btn-primary !px-6 !py-3 !text-base">Choose your exam</a>
            <Link href="/pricing" className="btn-ghost !px-6 !py-3 !text-base">See pricing</Link>
          </div>
          <p className="mt-3 text-sm text-muted">{FREE_TRIAL_QUESTIONS} free questions per exam, no account needed · {total.toLocaleString()} questions across {exams.length} exams</p>
        </div>

        {/* Product preview: a graded question */}
        <div className="card p-5 shadow-[0_30px_80px_-40px_rgba(67,56,202,0.45)]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-soft">7/10</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full w-[70%] rounded-full bg-gradient-to-r from-brand to-brand-2" /></div>
          </div>
          <p className="mt-4 text-sm text-soft">EC2 instances in private subnets must write to S3. No traffic may traverse the public internet.</p>
          <p className="mt-2 font-bold">Which solution meets these requirements?</p>
          <div className="mt-3 rounded-xl bg-bad-soft px-3 py-2 text-sm font-bold text-bad">Not quite. Here&apos;s the trap you fell into.</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="rounded-xl border-[1.5px] border-bad bg-bad-soft p-3">
              <p className="font-semibold">Deploy a NAT gateway and route private subnets to it.</p>
              <p className="mt-1.5 text-soft"><b className="text-ink">Your choice.</b> A NAT gateway sends traffic to S3&apos;s public endpoint through the internet gateway…</p>
            </div>
            <div className="rounded-xl border-[1.5px] border-ok bg-ok-soft p-3">
              <p className="font-semibold">Create an S3 gateway VPC endpoint.</p>
              <p className="mt-1.5 text-soft"><b className="text-ink">Correct.</b> Keeps S3 traffic on the AWS network with no NAT, and gateway endpoints are free.</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm font-semibold text-warn">Exam tip: &ldquo;S3 + private + no internet&rdquo; means a gateway endpoint.</div>
        </div>
      </section>

      <section id="exams" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Exams available</h2>
            <p className="mt-1 text-soft">Each exam has its own free trial. One {PRICE} pass unlocks one exam for {PASS_DAYS} days.</p>
          </div>
          <Link href="/pricing" className="font-bold text-brand">Compare passes →</Link>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {exams.map(({ exam, bank }) => (
            <article key={exam.slug} className="card flex flex-col p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="pill bg-brand-soft text-brand">{exam.vendor} · {exam.code}</span>
                <span className="text-xs font-bold uppercase tracking-wide text-muted">{exam.level}</span>
              </div>
              <h3 className="mt-3 text-xl font-extrabold">{exam.name}</h3>
              <p className="mt-1 text-soft">{exam.blurb}</p>
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-2 p-2"><dt className="text-xs text-muted">Questions</dt><dd className="text-lg font-extrabold">{bank}</dd></div>
                <div className="rounded-xl bg-surface-2 p-2"><dt className="text-xs text-muted">Mock exam</dt><dd className="text-lg font-extrabold">{exam.examQuestions}q · {exam.examMinutes}m</dd></div>
                <div className="rounded-xl bg-surface-2 p-2"><dt className="text-xs text-muted">Pass mark</dt><dd className="text-lg font-extrabold">{exam.passingScaled}</dd></div>
              </dl>
              <p className="eyebrow mt-5">Domains covered</p>
              <ul className="mt-2 flex-1 space-y-1 text-sm text-soft">
                {exam.domains.map((d) => (
                  <li key={d.id} className="flex justify-between gap-3"><span>{d.name}</span><span className="tabular-nums text-muted">{Math.round(d.weight * 100)}%</span></li>
                ))}
              </ul>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <TrialButton exam={exam.slug} />
                <Link href={`/practice/${exam.slug}`} className="btn-ghost w-full">Pass: {PRICE} / {PASS_DAYS} days</Link>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">More AWS certifications are coming. Questions are original and follow the official exam guides.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <h2 className="text-lg font-extrabold">{f.title}</h2>
              <p className="mt-2 text-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-3xl font-extrabold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            ["Try it free", `Pick an exam and answer ${FREE_TRIAL_QUESTIONS} real-style questions with full explanations. No sign-up.`],
            ["Unlock your exam", `One ${PRICE} pass gives ${PASS_DAYS} days of unlimited practice, timed mock exams and analytics for that exam.`],
            ["Close your gaps", "Reinforcement sessions target your weak and flagged topics until your readiness score clears the passing line."],
          ].map(([t, b], i) => (
            <li key={t} className="card flex gap-4 p-6">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-on-brand font-extrabold">{i + 1}</span>
              <div><h3 className="font-extrabold">{t}</h3><p className="mt-1 text-soft">{b}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-3xl font-extrabold tracking-tight">Questions</h2>
        <div className="mt-6 divide-y divide-line card">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer list-none font-bold marker:hidden">
                <span className="flex items-center justify-between gap-4">{q}<span className="text-brand transition group-open:rotate-45">+</span></span>
              </summary>
              <p className="mt-2 text-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="card flex flex-col items-start justify-between gap-5 bg-gradient-to-br from-[#4338CA] to-[#A21CAF] p-8 text-white md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">See how exam-ready you are in five minutes.</h2>
            <p className="mt-1 text-white/80">{FREE_TRIAL_QUESTIONS} free questions per exam, full explanations, no account.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAM_LIST.map((e) => (
              <form key={e.slug} action={startQuizAction}>
                <input type="hidden" name="exam" value={e.slug} />
                <input type="hidden" name="mode" value="trial" />
                <button className="btn !bg-white !px-5 !py-3 !text-[#4338CA]">Try {e.code} free</button>
              </form>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
