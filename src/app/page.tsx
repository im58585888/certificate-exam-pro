import type { Metadata } from "next";
import Link from "next/link";
import { startQuizAction } from "./actions";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS, PASS_DAYS, PASS_PRICE_CENTS } from "@/lib/exams";
import { ensureBank, questionsFor } from "@/lib/questions";
import { QuestionDemo, RequirementsDemo, StudyCardDemo, TrialPicker } from "@/components/LandingDemos";
import styles from "./landing.module.css";

const PRICE = `$${(PASS_PRICE_CENTS / 100).toFixed(2)}`;

export const metadata: Metadata = {
  title: "AI-native AWS exam prep · Certificate Exam Pro",
  description: "Understand complex AWS exam questions with AI and turn mistakes and key concepts into a personal study-card library that grows as you learn. Practice AIF-C01 and SAA-C03.",
};

const FAQ = [
  ["What does AI help me with?", "Two things: breaking complex questions into plain language, and generating study cards from mistakes and key concepts. You work through the reasoning, then keep the lessons in a personal library for later review."],
  ["Does simplifying a question give away the answer?", "The goal is to clarify the scenario and its requirements, not choose an answer for you. You still decide which option fits. Detailed answer explanations help you review the reasoning after you answer."],
  ["How does my study-card library grow?", "As you practice, generate cards from the mistakes and concepts you want to remember. Those cards build up over time into a personal collection you can return to, instead of starting your notes from scratch each session."],
  ["What can I try for free?", `${FREE_TRIAL_QUESTIONS} practice questions per exam and full answer explanations. No account or payment card needed. The animated examples on this page demonstrate the AI learning workflow.`],
  ["Are these real AWS exam questions?", "No. All questions are original and follow the official AWS exam guides. This is an independent learning service, not an exam-dump site or an AWS-affiliated product."],
  ["How does pricing work?", `A one-time ${PRICE} payment unlocks one exam for ${PASS_DAYS} days, including practice, timed mock exams, review and analytics. Passes do not renew automatically. Each exam has its own pass.`],
];

export default async function Home() {
  await ensureBank();
  const exams = EXAM_LIST.map((exam) => ({ exam, bank: questionsFor(exam.slug).length }));
  return (
    <div className={styles.landing}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>AI-native learning. AWS exam ready.</p>
            <h1 id="hero-title">Understand the question.<br /><span>Remember the concept.</span></h1>
            <p className={styles.heroDescription}>AI makes complex questions click and turns your mistakes into study cards. Build understanding—and a study library that grows with you.</p>
            <TrialPicker exams={EXAM_LIST.map((exam) => ({ slug: exam.slug, name: exam.shortName, code: exam.code }))} count={FREE_TRIAL_QUESTIONS} />
            <a className={styles.textLink} href="#how-it-works">Explore the two AI learning tools <span aria-hidden="true">↓</span></a>
          </div>
          <QuestionDemo />
        </div>
        <div className={styles.heroFootnote}><span>Built for understanding, beyond memorization.</span><span>AIF-C01 <i aria-hidden="true">/</i> SAA-C03</span></div>
      </section>

      <section id="how-it-works" className={styles.learningIntro} aria-labelledby="learning-title">
        <p className={styles.eyebrow}>A better way to learn</p>
        <h2 id="learning-title">Two AI tools.<br />One stronger understanding.</h2>
        <p>Get clarity in the moment. Keep the knowledge for the next time.</p>
      </section>

      <section className={`${styles.feature} ${styles.clarityFeature}`} aria-labelledby="clarity-title">
        <div className={styles.featureNumber}>01 <span>Make it click</span></div>
        <div className={styles.featureBody}>
          <h2 id="clarity-title">Complex question.<br />Clearer thinking.</h2>
          <p>Long scenarios shouldn&apos;t get in the way of learning. Ask AI to simplify the question so you can see what matters and reason through the options.</p>
          <ul className={styles.featureList}><li>Break down the scenario in plain language</li><li>Find the key requirements and constraints</li><li>Understand the question before choosing an answer</li></ul>
          <a className={styles.textLink} href="#hero-title">Try the question example <span aria-hidden="true">↑</span></a>
        </div>
        <RequirementsDemo />
      </section>

      <section className={`${styles.feature} ${styles.libraryFeature}`} aria-labelledby="library-title">
        <div className={styles.featureNumber}>02 <span>Keep what you learn</span></div>
        <div className={styles.featureBody}>
          <h2 id="library-title">Every mistake.<br /><span>A lesson worth keeping.</span></h2>
          <p>Turn a missed question or an important concept into an AI-generated study card. Keep adding to your collection as you practice, and revisit the lessons that matter to you.</p>
          <ul className={styles.featureList}><li>Generate cards from mistakes and key concepts</li><li>Capture the reasoning, not just the right answer</li><li>Build a personal study library over time</li></ul>
          <p className={styles.featureAside}>Your next session starts with everything you&apos;ve learned so far.</p>
        </div>
        <StudyCardDemo />
      </section>

      <section id="exams" className={styles.exams} aria-labelledby="exams-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Put understanding into practice</p><h2 id="exams-title">Your next certification starts here.</h2></div><p>Try {FREE_TRIAL_QUESTIONS} questions free.<br />No account. No payment card.</p></div>
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

      <section className={styles.finalCta} aria-labelledby="final-title"><p className={styles.eyebrow}>Learn a little. Keep a lot.</p><h2 id="final-title">Make your next question<br />a step forward.</h2><a href="#exams" className={styles.primaryButton}>Find your exam <span aria-hidden="true">↗</span></a><p>{FREE_TRIAL_QUESTIONS} free questions. Start without an account.</p></section>
    </div>
  );
}
