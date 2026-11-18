"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Mia, MiaThinking } from "./Mia";
import s from "./HeroMiaDemo.module.css";

// The landing hero's demo: a miniature of the real practice page with Mia beside a question, played as four short
// scenes (stuck → break it down → ask → got it). Static sample content: nothing here calls the AI. People who prefer
// reduced motion see each scene's final frame and no autoplay or cursor.

const SCENES = [
  { label: "Stuck? Mia's right there", ms: 4600 },
  { label: "She breaks it down", ms: 6200 },
  { label: "Ask her anything", ms: 5600 },
  { label: "Then nail it", ms: 5200 },
];

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Pops in after `delay` seconds when its scene is playing; already shown in later scenes. */
const pop = (playing: boolean, delay: number): { className: string; style?: CSSProperties } =>
  playing ? { className: s.pop, style: { "--d": `${delay}s` } as CSSProperties } : { className: "" };

/** Cursor targets are marked with data-target in the markup below. */
type Target = "b" | "c" | "button" | "composer" | "check" | "breakdown";
type Step = { to: Target | "rest"; at: number; click?: boolean };

/** Where the cursor goes in each scene (milliseconds into the scene). */
const PATHS: Step[][] = [
  [{ to: "rest", at: 0 }, { to: "b", at: 800 }, { to: "c", at: 1600 }, { to: "b", at: 2400 }, { to: "button", at: 3500 }, { to: "button", at: 4400 }],
  [{ to: "button", at: 0 }, { to: "button", at: 250, click: true }, { to: "button", at: 450 }, { to: "breakdown", at: 2600 }, { to: "breakdown", at: 6000 }],
  [{ to: "breakdown", at: 0 }, { to: "composer", at: 500 }, { to: "composer", at: 5400 }],
  [{ to: "composer", at: 0 }, { to: "c", at: 800 }, { to: "c", at: 950, click: true }, { to: "c", at: 1100 }, { to: "check", at: 1700 }, { to: "check", at: 1850, click: true }, { to: "check", at: 2000 }, { to: "check", at: 5000 }],
];

export function HeroMiaDemo() {
  const [scene, setScene] = useState(0);
  const [cycle, setCycle] = useState(0); // remounts the scene so its animations replay
  const [paused, setPaused] = useState(false);
  const app = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (paused || reducedMotion()) return;
    const t = setTimeout(() => { setScene((n) => (n + 1) % SCENES.length); setCycle((c) => c + 1); }, SCENES[scene].ms);
    return () => clearTimeout(t);
  }, [scene, paused, cycle]);

  // The cursor aims at the real on-screen positions of the options and buttons, so it fits any size.
  useEffect(() => {
    const root = app.current;
    const box = root?.getBoundingClientRect();
    const cur = cursor.current;
    if (!root || !box || !cur || reducedMotion()) return;
    const point = (step: Step) => {
      const el = step.to === "rest" ? null : root.querySelector(`[data-target="${step.to}"]`);
      if (!el) return [box.width * 0.3, box.height * 0.3];
      const r = el.getBoundingClientRect();
      const fx = step.to === "b" || step.to === "c" ? 0.35 : 0.5;
      return [r.left - box.left + r.width * fx, r.top - box.top + r.height * 0.55];
    };
    const path = PATHS[scene];
    const total = path[path.length - 1].at;
    const anim = cur.animate(path.map((step) => {
      const [x, y] = point(step);
      return { transform: `translate(${x}px, ${y}px) scale(${step.click ? 0.78 : 1})`, offset: step.at / total };
    }), { duration: total, fill: "forwards", easing: "ease-in-out" });
    return () => anim.cancel();
  }, [scene, cycle]);

  const go = (i: number) => { setScene(i); setCycle((c) => c + 1); };
  const at = (n: number) => scene === n; // this scene is playing its animations
  const after = (n: number) => scene >= n;

  return (
    <div className={s.frame} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-label="Animated example: Mia helping with a practice question">
      <div className={s.chrome} aria-hidden="true"><i /><i /><i /><span>awscertpass.com · Practice</span></div>

      <div ref={app} className={s.app} key={`${scene}-${cycle}`}>
        {/* The practice question */}
        <div className={s.question}>
          <p className={s.meta}>Q7 · S3 Storage Classes</p>
          <p className={s.text}>
            A team keeps 800 TB in S3 Standard. Access is{" "}
            <mark className={after(1) ? (at(1) ? s.markOn : s.markDone) : ""} style={{ "--d": "2.3s" } as CSSProperties}>unpredictable</mark>: data goes cold for months, then suddenly gets busy. Cut storage costs{" "}
            <mark className={after(1) ? (at(1) ? s.markOn : s.markDone) : ""} style={{ "--d": "2.9s" } as CSSProperties}>without retrieval fees</mark> or extra work.
          </p>
          <p className={s.prompt}>Which storage class should the team use?</p>
          <ul className={s.options}>
            <li><b>A</b>S3 One Zone-IA</li>
            <li data-target="b"><b>B</b>S3 Standard-IA</li>
            <li data-target="c" className={at(3) ? s.cWin : ""}>
              <b>C</b>S3 Intelligent-Tiering
              {at(3) && <span className={s.burst} aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ "--a": `${i * 36}deg` } as CSSProperties} />)}</span>}
            </li>
            <li><b>D</b>S3 Glacier Deep Archive</li>
          </ul>
          <div className={s.qFoot}>
            {at(3) ? <span className={`${s.correct} ${s.pop}`} style={{ "--d": "2.1s" } as CSSProperties}>✓ Correct!</span> : <span />}
            <span data-target="check" className={`${s.check} ${at(3) ? s.checkReady : ""}`}>Check answer</span>
          </div>
        </div>

        {/* Mia's panel */}
        <div className={s.mia}>
          <p className={s.miaHead}><Mia size={22} /> <b>Ask Mia about Q7</b></p>
          <div className={s.timeline}>
            {scene === 0 && (
              <>
                <p className={s.bubble}>Stuck on Q7? Tap below and I&apos;ll break it down.</p>
                <span data-target="button" className={s.cta}><i className={s.blink} aria-hidden="true" />Break it down for me</span>
              </>
            )}
            {scene === 1 && (
              <>
                <span data-target="button" className={`${s.cta} ${s.ctaGone}`}><i className={s.blink} aria-hidden="true" />Break it down for me</span>
                <div className={s.thinking}><MiaThinking height={46} /><span>Mia is reviewing this one…</span></div>
              </>
            )}
            {after(1) && (
              <div data-target="breakdown" className={`${s.card} ${at(1) ? s.cardIn : ""}`}>
                <p className={s.cardTitle}>Mia&apos;s breakdown</p>
                <ol className={s.reqs}>
                  {["Access is unpredictable", "Cut storage cost", "No retrieval fees", "No extra ops work"].map((r, i) => {
                    const p = pop(at(1), 2.1 + i * 0.4);
                    return <li key={r} className={p.className} style={p.style}><b>{i + 1}</b>{r}</li>;
                  })}
                </ol>
              </div>
            )}
            {after(2) && (
              <>
                <p {...pop(at(2), 2.0)} className={`${s.me} ${pop(at(2), 2.0).className}`}>What&apos;s Intelligent-Tiering?</p>
                {at(2) && <p className={s.dots} aria-hidden="true"><i /><i /><i /></p>}
                <div {...pop(at(2), 3.3)} className={`${s.reply} ${pop(at(2), 3.3).className}`}>
                  <Mia size={18} />
                  <table>
                    <tbody>
                      <tr><th>What it does</th><td>Moves data between tiers automatically</td></tr>
                      <tr><th>Best for</th><td>Changing or unknown access</td></tr>
                      <tr><th>Cost note</th><td>Small monitoring fee per object</td></tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div data-target="composer" className={s.composer}>
            {at(2) ? <span className={s.typing}>What&apos;s Intelligent-Tiering?</span> : <span className={s.placeholder}>Ask Mia anything…</span>}
          </div>
        </div>

        {at(3) && <p className={`${s.toast} ${s.pop}`} style={{ "--d": "2.9s" } as CSSProperties}>📌 Saved to your study sheet</p>}
        <span ref={cursor} className={s.cursor} aria-hidden="true">
          <svg viewBox="0 0 16 20" width="16" height="20"><path d="M1 1l13 9.5-6 1.2 3.4 6.6-2.4 1.2-3.4-6.6L1 17z" /></svg>
        </span>
      </div>

      <div className={s.footer}>
        <p className={s.caption} key={scene}><span>{scene + 1}</span>{SCENES[scene].label}</p>
        <div className={s.nav} role="tablist" aria-label="Choose a scene">
          {SCENES.map((sc, i) => (
            <button key={sc.label} type="button" role="tab" aria-selected={scene === i} aria-label={sc.label} onClick={() => go(i)} className={scene === i ? s.navOn : s.navDot}>
              {scene === i && !paused && <span className={s.navFill} key={cycle} style={{ animationDuration: `${sc.ms}ms` }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
