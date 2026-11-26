"use client";

import Image from "next/image";
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

/**
 * Mia's upper body beside "Meet Mia." in the hero headline, sized in em so she scales with the heading. Her mint
 * sweater stands out on both the dark and the light theme; a soft glow sits behind her and her lower edge fades out above the next
 * line. Decorative (the heading already says who she is).
 */
export function HeroMia() {
  return (
    <span className={styles.heroMia} aria-hidden="true">
      <span className={styles.heroMiaGlow} />
      <Image src="/mia/friendly.webp" alt="" width={308} height={440} priority className={styles.heroMiaImg} />
    </span>
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
