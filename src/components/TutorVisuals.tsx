"use client";

import { useEffect, useRef, useState } from "react";
import { Mia, MiaPose } from "./Mia";
import styles from "./TutorVisuals.module.css";

export { Mia };

// Animated, mostly wordless pictures of the AI tutor for the landing page. Static sample content:
// nothing here calls the AI. People who prefer reduced motion get the final frames, no autoplay.

/** Adds `visible` once the element scrolls into view, so its animations start where people can see them. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

const STEPS: { title: string; caption: string; art: React.ReactNode }[] = [
  { title: "Stuck?", caption: "Tap “Break it down”", art: <ArtStuck /> },
  { title: "See the point", caption: "What it's really testing", art: <ArtPoint /> },
  { title: "Answer it", caption: "Then learn the why", art: <ArtAnswer /> },
  { title: "Ask anything", caption: "Until it clicks", art: <ArtAsk /> },
];

export function TutorFlow() {
  const [ref, seen] = useInView<HTMLOListElement>();
  return (
    <ol ref={ref} className={`${styles.flow} ${seen ? styles.visible : ""}`}>
      {STEPS.map((s, i) => (
        <li key={s.title} className={styles.flowStep} style={{ animationDelay: `${i * 180}ms` }}>
          <div className={styles.art} aria-hidden="true">{s.art}</div>
          <span className={styles.stepNum}>{i + 1}</span>
          <h3>{s.title}</h3>
          <p>{s.caption}</p>
        </li>
      ))}
    </ol>
  );
}

function ArtStuck() {
  return <div className={styles.artStuck}><span className={styles.line} /><span className={styles.line} /><span className={styles.lineShort} /><b className={styles.bigQ}>?</b><span className={styles.btn}>✨ Break it down</span></div>;
}
function ArtPoint() {
  return <div className={styles.artPoint}><span className={styles.line} /><span className={styles.lineHi} /><span className={styles.line} /><b className={styles.target}>🎯</b></div>;
}
function ArtAnswer() {
  return <div className={styles.artAnswer}><span className={styles.opt}>A</span><span className={styles.optRight}>B <i>✓</i></span><span className={styles.opt}>C</span></div>;
}
function ArtAsk() {
  return <div className={styles.artAsk}><span className={styles.bubbleMe}>Why?</span><span className={styles.bubbleBot}>Because…</span></div>;
}

const MEMORY = [
  { title: "Finish a session", caption: "Every answer counts" },
  { title: "Weak spots first", caption: "Your study sheet sorts them" },
  { title: "Print a cheat sheet", caption: "One page for exam day" },
];

/**
 * Mia for the "Meet your tutor" strip: the white-blazer pose (it stands out on the dark background) over a soft
 * purple-to-mint glow. She rises in once when the section scrolls into view, then the glow breathes and she sways
 * very slightly. Still for people who prefer reduced motion.
 */
export function MiaSpotlight() {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`${styles.spot} ${seen ? styles.spotIn : ""}`}>
      <span className={styles.spotGlow} aria-hidden="true" />
      <span className={styles.spotSway}><MiaPose pose="welcoming" height={210} alt="Mia, your AI tutor" /></span>
    </div>
  );
}

export function MemoryFlow() {
  const [ref, seen] = useInView<HTMLOListElement>();
  return (
    <ol ref={ref} className={`${styles.memory} ${seen ? styles.visible : ""}`}>
      <li className={styles.memStep}>
        <div className={styles.memArt} aria-hidden="true">
          <div className={styles.results}>{["ok", "ok", "bad", "ok", "bad", "ok"].map((r, i) => <span key={i} className={r === "ok" ? styles.resOk : styles.resBad} style={{ animationDelay: `${300 + i * 160}ms` }}>{r === "ok" ? "✓" : "✕"}</span>)}</div>
        </div>
        <h3>{MEMORY[0].title}</h3><p>{MEMORY[0].caption}</p>
      </li>
      <li className={styles.memStep}>
        <div className={styles.memArt} aria-hidden="true">
          <div className={styles.bars}>
            {[["S3 classes", 35, "bad"], ["VPC endpoints", 62, "warn"], ["IAM policies", 90, "ok"]].map(([label, pct, tone], i) => (
              <div key={label as string} className={styles.barRow}><span>{label}</span><i className={styles[`bar_${tone}`]} style={{ width: `${pct}%`, animationDelay: `${900 + i * 200}ms` }} /></div>
            ))}
          </div>
        </div>
        <h3>{MEMORY[1].title}</h3><p>{MEMORY[1].caption}</p>
      </li>
      <li className={styles.memStep}>
        <div className={styles.memArt} aria-hidden="true">
          <div className={styles.sheet}><b>Cheat sheet</b>{[80, 60, 72, 50, 66].map((w, i) => <span key={i} style={{ width: `${w}%`, animationDelay: `${1600 + i * 140}ms` }} />)}<em>🖨️</em></div>
        </div>
        <h3>{MEMORY[2].title}</h3><p>{MEMORY[2].caption}</p>
      </li>
    </ol>
  );
}
