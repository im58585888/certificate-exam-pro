import type { Metadata } from "next";
import Link from "next/link";
import { startQuizAction } from "./actions";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS, PASS_DAYS, PASS_PRICE_CENTS } from "@/lib/exams";
import { ensureBank, questionsFor } from "@/lib/questions";
import { TrialPicker } from "@/components/LandingDemos";
import { HeroTutorAnimation, MemoryFlow, TutorFlow } from "@/components/TutorVisuals";
import styles from "./landing.module.css";

const PRICE = `$${(PASS_PRICE_CENTS / 100).toFixed(2)}`;

export const metadata: Metadata = {
  title: "AWS exam prep with an AI tutor · Certificate Exam Pro",
  description: "An AI tutor on every practice question: it breaks the question down, shows what it's testing, walks you through how to answer, and answers your follow-up questions. Practice AIF-C01 and SAA-C03.",
};

const FAQ = [
  ["What does the AI tutor do?", "It breaks each question down, shows what it's testing, explains the answer step by step and answers your follow-up questions."],
  ["Does it give away the answer?", "No. Before you answer, it explains the question but leaves the choice to you. The answer walk-through unlocks after."],
  ["Can I use it during a mock exam?", "Mock exams stay realistic, so the tutor switches on after you submit."],
  ["What is the study sheet?", "Every session adds to it: your weakest topics first, the questions you missed, and a printable cheat sheet."],
  ["What can I try for free?", `${FREE_TRIAL_QUESTIONS} questions per exam, AI tutor included. No account or card needed.`],
  ["Are these real AWS exam questions?", "No. They're original questions that follow the official AWS exam guides. We're not affiliated with AWS."],
  ["How does pricing work?", `${PRICE} unlocks one exam for ${PASS_DAYS} days. One payment, no auto-renewal.`],
];

export default async function Home() {
  await ensureBank();
  const exams = EXAM_LIST.map((exam) => ({ exam, bank: questionsFor(exam.slug).length }));
  return (
    <div className={styles.landing}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>✨ An AI tutor on every question</p>
            <h1 id="hero-title">Stuck on an AWS question?<br /><span>Ask your AI tutor.</span></h1>
            <p className={styles.heroDescription}>Breaks it down. Explains the why. Answers your questions.</p>
            <TrialPicker exams={EXAM_LIST.map((exam) => ({ slug: exam.slug, name: exam.shortName, code: exam.code }))} count={FREE_TRIAL_QUESTIONS} />
            <a className={styles.textLink} href="#how-it-works">See what the tutor does <span aria-hidden="true">↓</span></a>
          </div>
          <HeroTutorAnimation />
        </div>
        <div className={styles.heroFootnote}><span>Learn why the answer is right, not just which one.</span><span>AIF-C01 <i aria-hidden="true">/</i> SAA-C03</span></div>
      </section>

      <section id="how-it-works" className={styles.visualSection} aria-labelledby="learning-title">
        <p className={styles.eyebrow}>How the tutor works</p>
        <h2 id="learning-title">From stuck to <span>“got it”</span><br />in four taps.</h2>
        <TutorFlow />
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
        <div><p className={styles.eyebrow}>A little more clarity</p><h2 id="faq-title">Good questions.</h2><p>Everything else you might want to know before you begin.</p></div>
        <div>{FAQ.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-title"><p className={styles.eyebrow}>Your tutor is ready</p><h2 id="final-title">Bring it your hardest<br />AWS question.</h2><a href="#exams" className={styles.primaryButton}>Find your exam <span aria-hidden="true">↗</span></a><p>{FREE_TRIAL_QUESTIONS} free questions. Start without an account.</p></section>
    </div>
  );
}
