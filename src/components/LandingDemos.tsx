"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeToMotion(onChange: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const prefersReducedMotion = () => window.matchMedia(motionQuery).matches;
const serverMotionPreference = () => true;

function GifDemo({ name, title, description, height, eager = false }: {
  name: string;
  title: string;
  description: string;
  height: number;
  eager?: boolean;
}) {
  const reducedMotion = useSyncExternalStore(subscribeToMotion, prefersReducedMotion, serverMotionPreference);
  const [playOverride, setPlayOverride] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const figure = useRef<HTMLElement>(null);
  const playing = playOverride ?? !reducedMotion;
  const animating = playing && visible;
  const base = "/demos/" + name;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    if (figure.current) observer.observe(figure.current);
    return () => observer.disconnect();
  }, []);

  return (
    <figure ref={figure} className={styles.gifDemo} aria-label={title}>
      <Image
        src={animating ? base + ".gif" : base + "-poster.png"}
        alt={description}
        width={520}
        height={height}
        unoptimized
        loading={eager ? "eager" : "lazy"}
        className={styles.gifImage}
      />
      <figcaption className={styles.gifControls}>
        <span><span className={styles.playIndicator} data-playing={animating} aria-hidden="true" />{playing ? "Auto-playing example" : "Still preview"}</span>
        <button type="button" onClick={() => setPlayOverride(!playing)} aria-label={(playing ? "Pause " : "Play ") + title}>
          {playing ? "Pause animation" : "Play animation"}
        </button>
      </figcaption>
    </figure>
  );
}

export function QuestionDemo() {
  return <GifDemo name="simplify-question" title="question simplification" description="AI turns a long AWS networking question into plain language, keeping the private-subnet and no-public-internet requirements intact." height={515} eager />;
}

export function RequirementsDemo() {
  return <GifDemo name="key-requirements" title="key requirements" description="Three requirements are highlighted in sequence: EC2 in a private subnet, Amazon S3 as the destination, and no public internet traffic." height={383} />;
}

export function StudyCardDemo() {
  return <GifDemo name="study-library" title="study-card library" description="A library grows from two cards to three as a mistake about private access to S3 becomes a study card. The new card then reveals its key concept." height={681} />;
}
