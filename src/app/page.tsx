import type { Metadata } from "next";
import Link from "next/link";
import { startQuizAction } from "./actions";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS, PASS_DAYS, PASS_PRICE_CENTS } from "@/lib/exams";
import { ensureBank, questionsFor } from "@/lib/questions";
import { TrialPicker } from "@/components/LandingDemos";
import { HeroMiaDemo } from "@/components/HeroMiaDemo";
import { HeroMia, MemoryFlow, Mia, MiaSpotlight, TutorFlow } from "@/components/TutorVisuals";
import styles from "./landing.module.css";
import { JsonLd } from "@/components/JsonLd";
import { examProduct, faqPage, graph, organization, website } from "@/lib/seo";

const PRICE = `$${(PASS_PRICE_CENTS / 100).toFixed(2)}`;

export const metadata: Metadata = {
  title: { absolute: "AWS Practice Exams with an AI Tutor (CLF-C02, AIF-C01, SAA-C03) · Certificate Exam Pro" },
  alternates: { canonical: "/" },
  description: "Practice AWS exams with Mia, an AI tutor who breaks every question down, draws the real AWS architecture behind it, explains each service in depth, then reads your results and tells you which topics to study next. CLF-C02, AIF-C01 and SAA-C03.",
};

const FAQ: [string, string][] = [
  ["What does the AI tutor do?", "Mia breaks each question down, draws the AWS architecture in the scenario, explains the services in depth and answers your follow-up questions. After each session she reads your results and tells you which topics to study next."],
  ["Does it give away the answer?", "No. Before you answer, it explains the question but leaves the choice to you. The answer walk-through unlocks after."],
  ["Can I use it during a mock exam?", "Mock exams stay realistic, so the tutor switches on after you submit."],
  ["What is the study sheet?", "Every session adds to it: your weakest topics first, the questions you missed, and a printable cheat sheet."],
  ["What can I try for free?", `${FREE_TRIAL_QUESTIONS} questions per exam, AI tutor included. No account or card needed.`],
  ["Are these real AWS exam questions?", "No. They're original questions that follow the official AWS exam guides. We're not affiliated with AWS."],
  ["Are the questions up to date?", "We check every question against AWS's service lifecycle notices. When AWS retires, renames or closes a service a question mentions, the explanation says so with the date and source, and every change is listed on our What changed page."],
  ["How does pricing work?", `${PRICE} unlocks one exam for ${PASS_DAYS} days. One payment, no auto-renewal.`],
];

const STORY: [string, string][] = [
  ["Practice exam questions", "Original questions written to the official AWS exam guides, with the ones you haven't seen first."],
  ["Mia breaks it down", "Confused by a term or the question itself? Mia explains what it's testing, draws the architecture, and covers each service in depth."],
  ["Mia reads your results", "After every session she reviews what you missed and recommends the topics to deep dive, with a few tips to raise your score."],
  ["Review your study sheet", "Everything you need to revisit lands on one study sheet, and Mia can explain any topic on it further."],
];

const PROOF: [string, string][] = [
  ["Updated for 2026", "Every question is checked against AWS's service changes. Retired or renamed services get a dated note, and changes are public."],
  ["Unseen questions first", "Practice serves questions you haven't seen, so your score measures understanding, not memory."],
  ["Retry only your mistakes", "Missed and flagged questions come back on their own, answered fresh, until you've got them."],
  ["See the architecture", "Every explanation comes with a diagram of the real AWS setup in the scenario, so you see how the services fit together instead of memorizing names."],
  ["Ask Mia why", "Disagree with an answer? Mia explains any option simply or technically, right away."],
  ["Timed mock exams", "65 questions with the real time limit, weighted like the real exam, then a full scored review of every option."],
  ["Pause anytime", "Save and finish later, even mid mock exam. One pass works on laptop, phone and tablet. No ads."],
];

export default async function Home() {
  await ensureBank();
  const exams = EXAM_LIST.map((exam) => ({ exam, bank: questionsFor(exam.slug).length }));
  const totalQuestions = exams.reduce((n, e) => n + e.bank, 0);
  return (
    <div className={styles.landing}>
      <JsonLd data={graph(organization, website, faqPage(FAQ), ...exams.map((e) => examProduct(e.exam, e.bank)))} />
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>✨ Your AI tutor for AWS certification</p>
            <h1 id="hero-title"><span className={styles.meetLine}>Meet Mia.<HeroMia /></span><br /><span className={styles.overMia}>She&apos;ll get you through your AWS exam.</span></h1>
            <p className={styles.heroDescription}>Mia breaks down every question, draws the real AWS architecture behind it, and explains each service in depth. Then she reads your results and tells you exactly what to study next.</p>
            <TrialPicker exams={EXAM_LIST.map((exam) => ({ slug: exam.slug, name: exam.shortName, code: exam.code }))} count={FREE_TRIAL_QUESTIONS} />
            <a className={styles.textLink} href="#how-it-works">See what the tutor does <span aria-hidden="true">↓</span></a>
          </div>
          <HeroMiaDemo />
        </div>
        <div className={styles.heroFootnote}><span>{totalQuestions.toLocaleString()} practice questions · {PRICE} per exam for {PASS_DAYS} days · no auto-renewal</span><span>CLF-C02 <i aria-hidden="true">/</i> AIF-C01 <i aria-hidden="true">/</i> SAA-C03</span></div>
      </section>

      <section className={styles.visualSection} aria-labelledby="story-title" style={{ paddingBottom: 0 }}>
        <p className={styles.eyebrow}>How you&apos;ll study with Mia</p>
        <h2 id="story-title">Practice. Understand.<br /><span>Know what to study next.</span></h2>
        <ol className="mx-auto -mt-6 grid max-w-5xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {STORY.map(([title, body], i) => (
            <li key={title} className="rounded-2xl border border-line bg-bg p-5">
              <p className="text-sm font-extrabold text-brand">Step {i + 1}</p>
              <p className="mt-1 font-extrabold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-soft">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.visualSection} aria-labelledby="concepts-title" style={{ paddingBottom: 0 }}>
        <p className={styles.eyebrow}>Practice that builds real understanding</p>
        <h2 id="concepts-title">Don&apos;t just memorize AWS answers.<br /><span>Master the concepts.</span></h2>
        <ul className="mx-auto -mt-6 grid max-w-5xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
          {PROOF.map(([title, body]) => (
            <li key={title} className="rounded-2xl border border-line bg-bg p-5">
              <p className="font-extrabold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-soft">{body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-soft">
          <Link href="/features" className="font-bold text-brand hover:underline">See every feature</Link> · <Link href="/aws" className="font-bold text-brand hover:underline">Free AWS cheat sheets</Link> · <Link href="/changelog" className="font-bold text-brand hover:underline">What changed this month</Link>
        </p>
      </section>

      <section id="how-it-works" className={styles.visualSection} aria-labelledby="learning-title">
        <p className={styles.eyebrow}>How the tutor works</p>
        <h2 id="learning-title">From stuck to <span>“got it”</span><br />in four taps.</h2>
        <TutorFlow />
      </section>

      <section className={styles.meetMia} aria-labelledby="mia-title">
        <MiaSpotlight />
        <div>
          <p className={styles.eyebrow} id="mia-title">Meet your tutor</p>
          <p className={styles.miaQuote}>&ldquo;Bring me the question that confused you. I&apos;ll show you what it&apos;s really asking.&rdquo;</p>
          <p className={styles.miaSign}>Mia · AI tutor</p>
          <ul className={styles.miaPromises}>
            <li>Never gives the answer away first</li>
            <li>Draws diagrams and tables</li>
            <li>Answers your follow-up questions</li>
          </ul>
        </div>
      </section>

      <section className={`${styles.visualSection} ${styles.memorySection}`} aria-labelledby="library-title">
        <p className={styles.eyebrow}>It remembers, too</p>
        <h2 id="library-title">Every mistake becomes<br /><span>your study sheet.</span></h2>
        <MemoryFlow />
      </section>

      <section id="exams" className={styles.exams} aria-labelledby="exams-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Try the tutor free</p><h2 id="exams-title">Your next certification starts here.</h2></div><p>Try {FREE_TRIAL_QUESTIONS} questions free.<br />No account. No payment card.</p></div>
        <div className={styles.examGrid}>
          {exams.map(({ exam, bank }) => (
            <article key={exam.slug} className={styles.exam}>
              <div className={styles.examMeta}><span>{exam.code}</span><span>{exam.level}</span></div>
              <h3>{exam.shortName}</h3>
              <p className={styles.examDescription}>{exam.blurb}</p>
              <p className={styles.examFacts}><strong>{bank}</strong> practice questions <span aria-hidden="true">·</span> {exam.examQuestions}-question mock exams</p>
              <form action={startQuizAction}><input type="hidden" name="exam" value={exam.slug} /><input type="hidden" name="mode" value="trial" /><button className={styles.primaryButton}>Try {exam.code} free <span aria-hidden="true">↗</span></button></form>
              <details className={styles.examCoverage}><summary>View exam coverage <span aria-hidden="true">+</span></summary><ul>{exam.domains.map((domain) => <li key={domain.id}><span>{domain.name}</span><span>{Math.round(domain.weight * 100)}%</span></li>)}</ul><p>Mock exam: {exam.examMinutes} minutes · Passing score: {exam.passingScaled}/1,000</p></details>
            </article>
          ))}
        </div>
        <div className={styles.pricingNote}><p>Want to keep going? <strong>{PRICE} per exam / {PASS_DAYS} days.</strong> One payment. No auto-renewal.</p><Link href="/pricing" className={styles.textLink}>See pass details <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section className={styles.faq} aria-labelledby="faq-title">
        <div><p className={styles.eyebrow}>A little more clarity</p><h2 id="faq-title">Good questions.</h2><p>Everything else you might want to know before you begin. Still wondering about something? <Link href="/contact" className={styles.textLink}>Contact me</Link>.</p></div>
        <div>{FAQ.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-title"><div className={styles.ctaMia}><span className={styles.miaBubble}>I&apos;m ready when you are.</span><Mia size={64} /></div><p className={styles.eyebrow}>Your tutor is ready</p><h2 id="final-title">Bring it your hardest<br />AWS question.</h2><a href="#exams" className={styles.primaryButton}>Find your exam <span aria-hidden="true">↗</span></a><p>{FREE_TRIAL_QUESTIONS} free questions. Start without an account.</p></section>
    </div>
  );
}
