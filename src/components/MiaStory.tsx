"use client";

import { useEffect, useRef, useState } from "react";
import { MiaPose } from "./Mia";
import s from "./MiaStory.module.css";

// The landing page's "what Mia does" story: five scenes that play in turn once the section scrolls into view, each a
// small animated mock of the real screen. Static sample content; nothing here calls the AI. Hovering or focusing the
// stage pauses it, the step list jumps to a scene, and people who prefer reduced motion get still frames with no autoplay.

type Pose = Parameters<typeof MiaPose>[0]["pose"];

const SCENES: { title: string; caption: string; say: string; pose: Pose; art: () => React.ReactNode }[] = [
  { title: "Practice real exam scenarios", caption: "Original questions written to the AWS exam guides, unseen ones first.", say: "Pick your answer. I'll be right here.", pose: "confident", art: ArtPractice },
  { title: "Mia breaks it down", caption: "Stuck on a term or the question itself? She shows what it's really testing.", say: "See these words? They're the whole question.", pose: "thinking", art: ArtBreakdown },
  { title: "She draws the architecture", caption: "See how the AWS services connect, step by step, with the answer in place.", say: "Here's how it fits together.", pose: "friendly", art: ArtDiagram },
  { title: "Mia reads your results", caption: "After each session: the topics to deep dive and a few tips to raise your score.", say: "Two topics to deep dive, then you're close.", pose: "reviewing", art: ArtResults },
  { title: "See where your points are", caption: "Your study sheet maps every miss by AWS service. Mia marks what to fix first.", say: "Start with S3. That's your biggest win.", pose: "welcoming", art: ArtSheet },
];

const SCENE_MS = 5200;

export function MiaStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);

  // Start when the stage scrolls into view (and never autoplay for reduced motion).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once on mount
    setStill(reduce);
    const el = ref.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || paused || still) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % SCENES.length), SCENE_MS);
    return () => clearTimeout(t);
  }, [active, playing, paused, still]);

  const scene = SCENES[active];
  const Art = scene.art;
  const running = playing && !paused && !still;

  return (
    <div ref={ref} className={`${s.story} ${still ? s.still : ""}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ol className={s.rail}>
        {SCENES.map((sc, i) => (
          <li key={sc.title}>
            <button type="button" className={s.step} data-active={i === active} data-done={i < active} aria-current={i === active ? "step" : undefined} onClick={() => setActive(i)}>
              <span className={s.num}>{i + 1}</span>
              <span className={s.stepText}>
                <b>{sc.title}</b>
                <small>{sc.caption}</small>
              </span>
              {i === active && <i key={`${active}-${running}`} className={s.progress} data-running={running} style={{ animationDuration: `${SCENE_MS}ms` }} aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ol>

      <div className={s.stage} aria-live="polite">
        <div key={active} className={s.scene} aria-label={`${scene.title}: ${scene.caption}`} role="img">
          <div className={s.art} aria-hidden="true"><Art /></div>
          <span className={s.bubble} aria-hidden="true">{scene.say}</span>
          <div className={s.mia} aria-hidden="true">
            <MiaPose pose={scene.pose} height={140} />
          </div>
        </div>
        <div className={s.dots} aria-hidden="true">
          {SCENES.map((sc, i) => <span key={sc.title} data-active={i === active} />)}
        </div>
      </div>
    </div>
  );
}

// ---------- Scene art (decorative mocks of the real screens) ----------

function ArtPractice() {
  return (
    <div className={s.card}>
      <p className={s.meta}><span className={s.pill}>Resilient</span><span className={s.pillSoft}>Medium</span></p>
      <p className={s.stem}>A web app on EC2 must keep serving users if an Availability Zone fails…</p>
      <div className={s.opts}>
        <span className={s.opt}>A. One larger instance</span>
        <span className={`${s.opt} ${s.pick}`}>B. Auto Scaling across two AZs <i>✓</i></span>
        <span className={s.opt}>C. A bigger EBS volume</span>
      </div>
    </div>
  );
}

function ArtBreakdown() {
  return (
    <div className={s.card}>
      <span className={s.breakBtn}>✨ Break it down</span>
      <p className={s.stem}>
        Reports must reach S3 <mark className={s.mark}>without using the internet</mark> at the <mark className={s.mark} style={{ animationDelay: "1.1s" }}>lowest cost</mark>.
      </p>
      <div className={s.chips}>
        <span style={{ animationDelay: "1.8s" }}>🎯 Testing: private access to S3</span>
        <span style={{ animationDelay: "2.2s" }}>Requirement: no internet path</span>
      </div>
    </div>
  );
}

function ArtDiagram() {
  return (
    <div className={s.diagram}>
      <div className={s.zone}>
        <span className={s.zoneLabel}>VPC · private subnet</span>
        <span className={`${s.node} ${s.n1}`}>🖥️ App servers</span>
        <span className={`${s.link} ${s.l1}`}><b>1</b></span>
        <span className={`${s.node} ${s.n2} ${s.answer}`}>🔒 Gateway endpoint<em>✓ The answer</em></span>
      </div>
      <span className={`${s.link} ${s.l2}`}><b>2</b></span>
      <span className={`${s.node} ${s.n3}`}>🪣 S3 bucket</span>
    </div>
  );
}

function ArtResults() {
  return (
    <div className={s.results}>
      <div className={s.ring}><b>70%</b></div>
      <div className={s.dive}>
        <p className={s.diveTitle}>Deep dive these topics</p>
        {[["VPC endpoints", "missed 2"], ["S3 replication", "missed 1"]].map(([t, n], i) => (
          <span key={t} className={s.diveRow} style={{ animationDelay: `${1.3 + i * 0.4}s` }}><b>{t}</b> <small>{n}</small> <u>Cheat sheet →</u></span>
        ))}
        <span className={s.tip}>💡 Watch for “lowest cost” in the question</span>
      </div>
    </div>
  );
}

function ArtSheet() {
  const tiles: [string, string, string, number?][] = [
    ["Amazon S3", "7 to fix", "t0", 1], ["VPC", "6 to fix", "t1", 2], ["DynamoDB", "5", "t0", 3], ["KMS", "3", "t1"], ["EBS", "3", "t0"], ["RDS", "3", "t2"], ["IAM", "2", "t3"], ["Lambda", "2", "t2"], ["SQS", "2", "t3"],
  ];
  return (
    <div className={s.heat}>
      <p className={s.diveTitle}>Where your points are</p>
      <div className={s.heatGrid}>
        {tiles.map(([n, k, tone, f], i) => (
          <span key={n} className={`${s.heatTile} ${s[tone]}`} style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
            <b>{n}</b><small>{k}</small>{f && <em>{f}</em>}
          </span>
        ))}
      </div>
    </div>
  );
}
