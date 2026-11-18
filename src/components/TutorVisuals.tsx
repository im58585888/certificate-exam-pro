"use client";

import { useEffect, useRef, useState } from "react";
import { Mia, MiaPose } from "./Mia";
import styles from "./TutorVisuals.module.css";

export { Mia };

// Animated, mostly wordless pictures of the AI tutor for the landing page. Static sample content:
// nothing here calls the AI. People who prefer reduced motion get the final frames, no autoplay.

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

const SCENES = ["Spots the clues", "Draws the picture", "Answers your questions"];
const SCENE_MS = 5000;

export function HeroTutorAnimation() {
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0); // remounts the scene so its animation replays

  useEffect(() => {
    if (paused || reducedMotion()) return;
    const t = setTimeout(() => { setScene((s) => (s + 1) % SCENES.length); setCycle((c) => c + 1); }, SCENE_MS);
    return () => clearTimeout(t);
  }, [scene, paused, cycle]);

  const go = (i: number) => { setScene(i); setCycle((c) => c + 1); };

  return (
    <div className={styles.hero} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-label="Animated example of the AI tutor">
      <div className={styles.heroBar}>
        <span className={styles.badge}>
          <span className={styles.miaWrap}><Mia size={24} /><span className={`${styles.live} ${styles.miaLive}`} aria-hidden="true" /></span>
          Mia · AI tutor
        </span>
        <span className={styles.heroStep}>{scene + 1} / {SCENES.length}</span>
      </div>
      <div className={styles.stage} key={`${scene}-${cycle}`} aria-live="polite">
        {scene === 0 && <SceneClues />}
        {scene === 1 && <ScenePicture />}
        {scene === 2 && <SceneChat />}
      </div>
      <div className={styles.caption}><span className={styles.captionNum}>{scene + 1}</span>{SCENES[scene]}</div>
      <div className={styles.dots} role="tablist" aria-label="Choose a scene">
        {SCENES.map((label, i) => (
          <button key={label} type="button" role="tab" aria-selected={scene === i} aria-label={label} onClick={() => go(i)} className={scene === i ? styles.dotActive : styles.dot}>
            {scene === i && !paused && <span className={styles.dotFill} key={cycle} style={{ animationDuration: `${SCENE_MS}ms` }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function SceneClues() {
  return (
    <div className={styles.clues}>
      <p className={styles.qLabel}>Practice question</p>
      <p className={styles.qText}>
        EC2 instances in a <mark className={styles.mark1}>private subnet</mark> must write to Amazon S3. <mark className={styles.mark2}>No traffic may cross the public internet.</mark> Which solution works?
      </p>
      <div className={styles.chips}>
        <span className={`${styles.chip} ${styles.pop1}`}>🔒 No door to the internet</span>
        <span className={`${styles.chip} ${styles.pop2}`}>🚫 Must stay inside AWS</span>
      </div>
      <p className={`${styles.testing} ${styles.pop3}`}>🎯 Testing: <b>private access to AWS services</b></p>
    </div>
  );
}

function ScenePicture() {
  return (
    <svg className={styles.picture} viewBox="0 0 360 230" role="img" aria-label="EC2 in a locked VPC reaching S3 privately, with the internet crossed out">
      <g className={styles.fadeIn1}>
        <rect x="128" y="8" width="104" height="44" rx="22" className={styles.cloud} />
        <text x="180" y="35" textAnchor="middle" className={styles.svgLabel}>🌐 Internet</text>
      </g>
      <rect x="14" y="78" width="160" height="136" rx="14" className={styles.vpc} />
      <text x="28" y="206" className={styles.svgSmall}>Your VPC · private</text>
      <g className={styles.fadeIn0}>
        <rect x="44" y="128" width="96" height="58" rx="10" className={styles.box} />
        <text x="92" y="153" textAnchor="middle" className={styles.svgLabel}>🔒 EC2</text>
        <text x="92" y="172" textAnchor="middle" className={styles.svgSmall}>servers</text>
      </g>
      <path d="M92 128 C 92 90, 150 60, 160 52" className={styles.badPath} />
      <g className={styles.stamp}>
        <circle cx="128" cy="80" r="15" className={styles.stampCircle} />
        <text x="128" y="86" textAnchor="middle" className={styles.stampX}>✕</text>
      </g>
      <g className={styles.fadeIn1}>
        <rect x="248" y="128" width="96" height="58" rx="10" className={styles.box} />
        <text x="296" y="153" textAnchor="middle" className={styles.svgLabel}>🪣 S3</text>
        <text x="296" y="172" textAnchor="middle" className={styles.svgSmall}>storage</text>
      </g>
      <path id="goodPath" d="M140 157 L 248 157" className={styles.goodPath} />
      <circle r="6" className={styles.packet}>
        <animateMotion dur="1.4s" begin="2.4s" repeatCount="indefinite" path="M140 157 L 248 157" />
      </circle>
      <g className={styles.okTag}>
        <rect x="150" y="190" width="90" height="26" rx="13" className={styles.okPill} />
        <text x="195" y="207" textAnchor="middle" className={styles.okText}>✓ stays private</text>
      </g>
    </svg>
  );
}

function SceneChat() {
  return (
    <div className={styles.chat}>
      <p className={`${styles.user} ${styles.pop1}`}>Why not a NAT gateway?</p>
      <p className={`${styles.typing} ${styles.typingShow} ${styles.typingMia}`} aria-hidden="true"><span /><span /><span /></p>
      <div className={`${styles.botRow} ${styles.botShow}`}><Mia size={26} /><p className={styles.bot}>A NAT gateway still sends traffic <b>out to the internet</b>. That breaks the rule. ❌</p></div>
      <p className={`${styles.user} ${styles.pop4}`}>So what keeps it private?</p>
      <div className={`${styles.botRow} ${styles.pop5}`}><Mia size={26} /><p className={styles.bot}>A <b>gateway endpoint</b>: a private road from your VPC to S3. ✅</p></div>
    </div>
  );
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
