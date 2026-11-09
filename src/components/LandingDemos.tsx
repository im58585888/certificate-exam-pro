"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { startQuizAction } from "@/app/actions";
import styles from "@/app/landing.module.css";

function StartButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return <button className={styles.primaryButton} disabled={pending}>{pending ? "Starting your trial…" : `Try ${count} questions free`}<span aria-hidden="true">↗</span></button>;
}

export function TrialPicker({ exams, count }: { exams: { slug: string; name: string; code: string }[]; count: number }) {
  return <form action={startQuizAction} className={styles.trialPicker}><input type="hidden" name="mode" value="trial" /><label htmlFor="hero-exam">Choose your AWS exam</label><div className={styles.trialControls}><select id="hero-exam" name="exam" defaultValue={exams[0]?.slug}>{exams.map((exam) => <option key={exam.slug} value={exam.slug}>{exam.name} · {exam.code}</option>)}</select><StartButton count={count} /></div><p>No account or payment card needed.</p></form>;
}

export function QuestionDemo() {
  const [simplified, setSimplified] = useState(false);
  return (
    <div className={styles.questionDemo} aria-label="Interactive question simplification example">
      <div className={styles.demoHeader}><span>THE CLARITY TOOL</span><span>Interactive example</span></div>
      <div className={styles.questionContent}>
        <div className={styles.questionTopline}><span>SAA-C03 / Networking</span><span>01</span></div>
        <div className={styles.questionText} aria-live="polite" aria-atomic="true" key={String(simplified)}>
          <p className={styles.smallLabel}>{simplified ? "SIMPLIFIED WITH AI" : "THE ORIGINAL QUESTION"}</p>
          {simplified ? <><h3>Your servers need to write to S3.<br />The traffic must stay private.</h3><p>Which connection lets EC2 reach S3 without using the public internet?</p><p className={styles.constraint}><strong>Keep in mind:</strong> the servers are in a private subnet. Every requirement still matters.</p></> : <><h3>A private subnet.<br />A public-cloud question.</h3><p>A company runs Amazon EC2 instances in private subnets of a VPC. The instances must write data to Amazon S3. Security policy requires that no traffic traverse the public internet.</p><p className={styles.originalPrompt}>Which solution meets these requirements?</p></>}
        </div>
        <button type="button" onClick={() => setSimplified(!simplified)} className={styles.simplifyButton} aria-pressed={simplified}><span className={styles.aiTag} aria-hidden="true">AI</span>{simplified ? "Show original question" : "Simplify this question"}<span aria-hidden="true">{simplified ? "↶" : "↗"}</span></button>
        <p className={styles.demoCaption}>{simplified ? "Same question. Same challenge. A clearer way in." : "Try it. See the question with a little more clarity."}</p>
      </div>
      <div className={styles.demoFooter}><span>Understand first. Then choose your answer.</span><span aria-hidden="true">01 — 02</span></div>
    </div>
  );
}

const initialCards = [
  { title: "Tokens & inference cost", source: "Key concept", question: "What drives on-demand inference cost?", answer: "Input and output tokens both contribute. Shorten repetitive prompts and summarize long histories when appropriate." },
  { title: "Precision vs. recall", source: "From a mistake", question: "When does recall matter most?", answer: "When missing a positive case is costly. Recall measures how many actual positives the model finds." },
];
const mistakeCard = { title: "Private access to S3", source: "From this mistake", question: "How can EC2 reach S3 without public internet traffic?", answer: "Use an S3 gateway VPC endpoint with the appropriate route tables and policies. A NAT gateway alone does not meet the private-traffic requirement." };

export function StudyCardDemo() {
  const [generated, setGenerated] = useState(false);
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const cards = generated ? [...initialCards, mistakeCard] : initialCards;
  const card = cards[active];
  const generate = () => { setGenerated(true); setActive(2); setRevealed(false); };
  return (
    <div className={styles.studyDemo} aria-label="Interactive study-card library example">
      <div className={styles.demoHeader}><span>YOUR STUDY LIBRARY</span><span>Interactive example</span></div>
      <div className={styles.libraryToolbar}><strong>Small lessons. Lasting knowledge.</strong><span aria-live="polite">{cards.length} cards</span></div>
      <div className={styles.libraryList} aria-label="Example study cards">{cards.map((item, index) => <button type="button" key={item.title} aria-pressed={active === index} onClick={() => { setActive(index); setRevealed(false); }} className={`${styles.libraryItem} ${active === index ? styles.activeCard : ""}`}><span className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.source}</small></span><span aria-hidden="true">↗</span></button>)}</div>
      <div className={styles.flashcard} aria-live="polite" aria-atomic="true"><p className={styles.smallLabel}>{revealed ? "THE CONCEPT TO KEEP" : "A MOMENT TO REMEMBER"}</p><p className={styles.cardQuestion}>{revealed ? card.answer : card.question}</p><button type="button" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? "Back to question" : "Reveal concept"} <span aria-hidden="true">↶</span></button></div>
      <div className={styles.generateArea}><p>{generated ? "A new lesson, added to your collection." : "Missed the S3 question? Keep the lesson."}</p><button type="button" onClick={generate} disabled={generated} className={styles.generateButton}>{generated ? "Study card added ✓" : "Generate a study card"}<span aria-hidden="true">{generated ? "" : "+"}</span></button><span className={styles.exampleNote}>Sample content. Try the workflow here.</span>{generated && <button type="button" className={styles.resetDemo} onClick={() => { setGenerated(false); setActive(0); setRevealed(false); }}>Reset example</button>}</div>
    </div>
  );
}
