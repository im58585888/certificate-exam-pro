import type { Metadata } from "next";
import Link from "next/link";
import { startQuizAction } from "./actions";
import { EXAM_LIST, FREE_TRIAL_QUESTIONS, PASS_DAYS, PASS_PRICE_CENTS } from "@/lib/exams";
import { ensureBank, questionsFor } from "@/lib/questions";
import { StudyCardDemo, TrialPicker, TutorDemo } from "@/components/LandingDemos";
import styles from "./landing.module.css";

const PRICE = `$${(PASS_PRICE_CENTS / 100).toFixed(2)}`;

export const metadata: Metadata = {
  title: "AWS exam prep with an AI tutor · Certificate Exam Pro",
  description: "An AI tutor on every practice question: it breaks the question down, shows what it's testing, walks you through how to answer, and answers your follow-up questions. Practice AIF-C01 and SAA-C03.",
};

const TUTOR_STEPS = [
  ["🎯", "What it's testing", "Names the skill behind the question, so you know which concept to reach for.", "Before you answer"],
  ["✨", "Break it down", "Retells the scenario in plain English, spots the clues in the wording and explains every term and option, without giving the answer away.", "Before you answer"],
  ["💡", "How to answer", "Walks through the reasoning step by step: the hard requirement, why each wrong option fails, and the exam tip to remember.", "After you answer"],
  ["💬", "Chat with it", "Still unsure? Ask a follow-up in your own words, like \"why not a NAT gateway?\", and get a clear answer.", "Any time"],
];

const FAQ = [
  ["What does the AI tutor do?", "On every practice question it can break the question down (what it's testing, the scenario in plain English, the clues in the wording and the terms you need), walk you through how to answer once you've chosen, and answer follow-up questions in a chat."],
  ["Does the breakdown give away the answer?", "No. Before you answer, the tutor explains the question and the options but leaves the choice to you. The step-by-step answer walk-through unlocks after you've answered."],
  ["Can I use the tutor during a mock exam?", "Timed mock exams stay exam-realistic, so the tutor is off until you submit. Then you can review every question with it."],
  ["What is the study sheet?", "Every session you finish adds to it. It groups the topics you've practised, weakest first, lists the questions you missed, and turns them into concept cards and a printable cheat sheet."],
  ["What can I try for free?", `${FREE_TRIAL_QUESTIONS} practice questions per exam, with the AI tutor and full answer explanations. No account or payment card needed.`],
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
            <p className={styles.eyebrow}>✨ An AI tutor on every question</p>
            <h1 id="hero-title">Stuck on an AWS question?<br /><span>Ask your AI tutor.</span></h1>
            <p className={styles.heroDescription}>It breaks the question down, shows what it&apos;s really testing, walks you through how to answer, and chats with you until it clicks. Like a patient teacher sitting next to you.</p>
            <TrialPicker exams={EXAM_LIST.map((exam) => ({ slug: exam.slug, name: exam.shortName, code: exam.code }))} count={FREE_TRIAL_QUESTIONS} />
            <a className={styles.textLink} href="#how-it-works">See what the tutor does <span aria-hidden="true">↓</span></a>
          </div>
          <TutorDemo />
        </div>
        <div className={styles.heroFootnote}><span>Learn why the answer is right, not just which one.</span><span>AIF-C01 <i aria-hidden="true">/</i> SAA-C03</span></div>
      </section>

      <section id="how-it-works" className={styles.learningIntro} aria-labelledby="learning-title">
        <p className={styles.eyebrow}>Meet your AI tutor</p>
        <h2 id="learning-title">Every question becomes<br />a lesson.</h2>
        <p>Right beside each practice question. Ask as much as you need.</p>
      </section>

      <section className={styles.tutorSteps4} aria-label="What the AI tutor does">
        {TUTOR_STEPS.map(([icon, title, body, when]) => (
          <article key={title}><span className={styles.stepIcon} aria-hidden="true">{icon}</span><h3>{title}</h3><p>{body}</p><small>{when}</small></article>
        ))}
      </section>

      <section className={`${styles.feature} ${styles.libraryFeature}`} aria-labelledby="library-title">
        <div className={styles.featureNumber}>✨ <span>It remembers, too</span></div>
        <div className={styles.featureBody}>
          <h2 id="library-title">Every mistake.<br /><span>A lesson worth keeping.</span></h2>
          <p>Every session you finish adds to your study sheet. The tutor turns your weakest topics and missed questions into concept cards and a printable cheat sheet.</p>
          <ul className={styles.featureList}><li>Weakest topics first, with the questions you missed</li><li>Concept cards with key points, look-alikes and exam traps</li><li>A one-page cheat sheet to print before exam day</li></ul>
          <p className={styles.featureAside}>Your next session starts with everything you&apos;ve learned so far.</p>
        </div>
        <StudyCardDemo />
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
