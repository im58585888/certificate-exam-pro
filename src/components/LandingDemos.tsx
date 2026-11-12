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

// A scripted walk through the AI tutor. Static sample content: the landing page never calls the AI.
const DEMO_OPTIONS = ["Add a NAT gateway in a public subnet", "Add a gateway VPC endpoint for S3", "Attach an internet gateway and tighten security groups", "Set up a Site-to-Site VPN"];
const CHAT: { q: string; a: string }[] = [
  { q: "Why not a NAT gateway?", a: "A NAT gateway hides your servers' private addresses, but the traffic still leaves through the internet gateway to reach S3. That breaks the \"no public internet\" rule." },
  { q: "Gateway vs. interface endpoint?", a: "Both keep traffic private. A gateway endpoint is a route-table entry, only for S3 and DynamoDB, and has no hourly charge. An interface endpoint puts a network card in your subnet and works for many services." },
  { q: "Give me a memory trick", a: "\"S3 or DynamoDB + private + no internet\" → think gateway endpoint first. Free, and just a route." },
];
type Tab = "breakdown" | "answer" | "chat";

export function TutorDemo() {
  const [tab, setTab] = useState<Tab>("breakdown");
  const [asked, setAsked] = useState<number[]>([]);
  const tabs: [Tab, string, string][] = [["breakdown", "✨", "Break it down"], ["answer", "💡", "How to answer"], ["chat", "💬", "Ask the tutor"]];
  return (
    <div className={styles.tutorDemo} aria-label="Interactive AI tutor example">
      <div className={styles.demoHeader}><span>YOUR AI TUTOR</span><span>Interactive example</span></div>
      <div className={styles.tutorQuestion}>
        <div className={styles.questionTopline}><span>SAA-C03 / Networking</span><span>Practice question</span></div>
        <p>EC2 instances in a <b>private subnet</b> must write data to Amazon S3. Security policy says <b>no traffic may cross the public internet</b>. Which solution meets these requirements?</p>
        <ol className={styles.demoOptions}>{DEMO_OPTIONS.map((o, i) => <li key={o} className={tab === "answer" && i === 1 ? styles.demoCorrect : ""}>{o}</li>)}</ol>
      </div>
      <div className={styles.tutorTabs} role="tablist">
        {tabs.map(([id, icon, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={tab === id ? styles.tutorTabActive : ""}><span aria-hidden="true">{icon}</span>{label}</button>)}
      </div>
      <div className={styles.tutorPanel} role="tabpanel" aria-live="polite" key={tab}>
        {tab === "breakdown" && <>
          <p className={styles.smallLabel}>What it&apos;s testing</p>
          <p className={styles.tutorLead}>Reaching an AWS service privately from inside a VPC.</p>
          <p className={styles.smallLabel}>In plain English</p>
          <p>Your servers sit in a locked room with no door to the street. They need to drop files into S3. How do they get there without stepping outside?</p>
          <p className={styles.smallLabel}>Clues in the wording</p>
          <ul className={styles.tutorClues}><li><b>&ldquo;private subnet&rdquo;</b> means no direct route to the internet</li><li><b>&ldquo;no public internet&rdquo;</b> rules out anything that goes out and back in</li></ul>
          <p className={styles.tutorMove}>Your move: which option keeps the whole trip inside AWS&apos;s network? <span>No spoilers. You still choose.</span></p>
        </>}
        {tab === "answer" && <>
          <p className={styles.smallLabel}>After you answer: step by step</p>
          <ol className={styles.tutorSteps}>
            <li><b>Find the hard rule.</b> No traffic on the public internet.</li>
            <li><b>Rule out.</b> NAT and internet gateways both go through the internet. A VPN connects to your office, not to S3.</li>
            <li><b>Pick.</b> A gateway VPC endpoint adds a private route to S3 inside AWS.</li>
            <li><b>Exam tip.</b> S3 or DynamoDB + private = gateway endpoint.</li>
          </ol>
        </>}
        {tab === "chat" && <>
          <div className={styles.chatLog}>
            {asked.length === 0 && <p className={styles.chatEmpty}>Stuck on something? Ask in your own words. Try one:</p>}
            {asked.map((i) => <div key={i}><p className={styles.chatUser}>{CHAT[i].q}</p><p className={styles.chatBot}>{CHAT[i].a}</p></div>)}
          </div>
          <div className={styles.chatChips}>{CHAT.map((c, i) => !asked.includes(i) && <button key={c.q} type="button" onClick={() => setAsked([...asked, i])}>{c.q}</button>)}</div>
          {asked.length > 0 && <button type="button" className={styles.resetDemo} onClick={() => setAsked([])}>Reset example</button>}
        </>}
      </div>
      <div className={styles.demoFooter}><span>Sample content. In practice, it&apos;s written for every question.</span><span aria-hidden="true">✨ 💡 💬</span></div>
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
    <div className={styles.studyDemo} aria-label="Interactive study sheet example">
      <div className={styles.demoHeader}><span>YOUR STUDY SHEET</span><span>Interactive example</span></div>
      <div className={styles.libraryToolbar}><strong>Small lessons. Lasting knowledge.</strong><span aria-live="polite">{cards.length} cards</span></div>
      <div className={styles.libraryList} aria-label="Example study cards">{cards.map((item, index) => <button type="button" key={item.title} aria-pressed={active === index} onClick={() => { setActive(index); setRevealed(false); }} className={`${styles.libraryItem} ${active === index ? styles.activeCard : ""}`}><span className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.source}</small></span><span aria-hidden="true">↗</span></button>)}</div>
      <div className={styles.flashcard} aria-live="polite" aria-atomic="true"><p className={styles.smallLabel}>{revealed ? "THE CONCEPT TO KEEP" : "A MOMENT TO REMEMBER"}</p><p className={styles.cardQuestion}>{revealed ? card.answer : card.question}</p><button type="button" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? "Back to question" : "Reveal concept"} <span aria-hidden="true">↶</span></button></div>
      <div className={styles.generateArea}><p>{generated ? "A new lesson, added to your collection." : "Missed the S3 question? The tutor keeps the lesson."}</p><button type="button" onClick={generate} disabled={generated} className={styles.generateButton}>{generated ? "Added to your study sheet ✓" : "Finish the session"}<span aria-hidden="true">{generated ? "" : "+"}</span></button><span className={styles.exampleNote}>Sample content. Try the workflow here.</span>{generated && <button type="button" className={styles.resetDemo} onClick={() => { setGenerated(false); setActive(0); setRevealed(false); }}>Reset example</button>}</div>
    </div>
  );
}
