"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// A fireworks show over the page when a practice answer is correct, with synthesized sound.
// Five styles take turns as the headline burst (starting at a random one) so it doesn't get stale,
// with the others mixed in. Skipped for people who prefer reduced motion.

type Style = "peony" | "ring" | "willow" | "crossette" | "heart";
const STYLES: Style[] = ["peony", "ring", "willow", "crossette", "heart"];
// Saturated colours so sparks read on both the light and dark themes.
const PALETTES = [
  ["#ef4444", "#f59e0b", "#ec4899"],
  ["#0ea5e9", "#6366f1", "#a855f7"],
  ["#f59e0b", "#ea580c", "#eab308"],
  ["#10b981", "#0891b2", "#22c55e"],
  ["#e11d48", "#db2777", "#f43f5e"],
];

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; drag: number; gravity: number; split?: boolean }
interface Rocket { x: number; y: number; vy: number; targetY: number; style: Style; colors: string[] }

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function burst(style: Style, x: number, y: number, colors: string[], scale: number): Spark[] {
  const out: Spark[] = [];
  const add = (vx: number, vy: number, o: Partial<Spark> = {}) =>
    out.push({ x, y, vx: vx * scale, vy: vy * scale, life: 0, max: 60, color: pick(colors), size: 2.2, drag: 0.97, gravity: 0.05, ...o });
  if (style === "peony") {
    for (let i = 0; i < 90; i++) { const a = rand(0, Math.PI * 2), s = rand(1, 6); add(Math.cos(a) * s, Math.sin(a) * s, { max: rand(45, 70) }); }
  } else if (style === "ring") {
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; add(Math.cos(a) * 5, Math.sin(a) * 5, { max: 55, size: 2.6 }); }
    for (let i = 0; i < 20; i++) { const a = rand(0, Math.PI * 2); add(Math.cos(a) * 1.5, Math.sin(a) * 1.5, { max: 40 }); }
  } else if (style === "willow") {
    for (let i = 0; i < 70; i++) { const a = rand(0, Math.PI * 2), s = rand(1.5, 4.5); add(Math.cos(a) * s, Math.sin(a) * s, { max: rand(80, 110), drag: 0.985, gravity: 0.035, size: 1.8, color: pick(["#f59e0b", "#eab308", "#ea580c"]) }); }
  } else if (style === "crossette") {
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; add(Math.cos(a) * 4.5, Math.sin(a) * 4.5, { max: 32, size: 3, split: true }); }
  } else {
    for (let i = 0; i < 80; i++) {
      const t = (i / 80) * Math.PI * 2;
      const hx = 16 * Math.sin(t) ** 3, hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      add(hx * 0.33, hy * 0.33, { max: 60, gravity: 0.02, drag: 0.95, size: 2.4 });
    }
  }
  return out;
}

const START = Math.floor(Math.random() * STYLES.length);

// The learner's sound preference, remembered in this browser (on unless they turn it off).
const SOUND_KEY = "cep:sound";
const listeners = new Set<() => void>();
function soundOn() { try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; } }
export function useCelebrationSound(): [boolean, () => void] {
  const on = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, soundOn, () => true);
  const toggle = () => { try { localStorage.setItem(SOUND_KEY, on ? "off" : "on"); } catch {} listeners.forEach((cb) => cb()); };
  return [on, toggle];
}

// Sound is synthesized with Web Audio, so there are no files to load. The context is created on the
// first show, which always follows a click, so browsers allow it to play.
let audio: AudioContext | null = null;
let noise: AudioBuffer | null = null;
function sfx(): { ctx: AudioContext; out: GainNode; noise: AudioBuffer } | null {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    if (!noise) {
      noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const out = audio.createGain();
    out.gain.value = 0.5;
    out.connect(audio.destination);
    return { ctx: audio, out, noise };
  } catch {
    return null;
  }
}

function playLaunch(a: NonNullable<ReturnType<typeof sfx>>, at: number) {
  const { ctx, out } = a;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(rand(500, 700), at);
  osc.frequency.exponentialRampToValueAtTime(rand(1400, 2000), at + 0.5);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.05, at + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);
  osc.connect(g).connect(out);
  osc.start(at); osc.stop(at + 0.6);
}

function playBoom(a: NonNullable<ReturnType<typeof sfx>>, at: number, crackle: boolean) {
  const { ctx, out, noise } = a;
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(rand(1800, 2600), at);
  filter.frequency.exponentialRampToValueAtTime(120, at + 1);
  g.gain.setValueAtTime(rand(0.5, 0.8), at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
  src.connect(filter).connect(g).connect(out);
  src.start(at, Math.random() * 0.5); src.stop(at + 1.2);
  const thump = ctx.createOscillator(), tg = ctx.createGain();
  thump.frequency.setValueAtTime(rand(90, 130), at);
  thump.frequency.exponentialRampToValueAtTime(40, at + 0.3);
  tg.gain.setValueAtTime(0.5, at);
  tg.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
  thump.connect(tg).connect(out);
  thump.start(at); thump.stop(at + 0.45);
  if (!crackle) return;
  for (let i = 0; i < 14; i++) {
    const t = at + 0.25 + Math.random() * 0.8;
    const c = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), cg = ctx.createGain();
    c.buffer = noise;
    hp.type = "highpass"; hp.frequency.value = 3000;
    cg.gain.setValueAtTime(rand(0.08, 0.2), t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    c.connect(hp).connect(cg).connect(out);
    c.start(t, Math.random() * 0.9); c.stop(t + 0.04);
  }
}

export function Fireworks({ trigger, sound = true }: { trigger: number; sound?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(1.4, Math.max(0.7, w / 900));

    // A volley of rockets across the screen, then a finale where several go up at once.
    const lead = (START + trigger) % STYLES.length;
    const count = w < 640 ? 9 : 14;
    const finale = 5;
    const rockets: (Rocket & { boomed?: boolean })[] = Array.from({ length: count }, (_, i) => ({
      x: w * rand(0.1, 0.9), y: h + 10, vy: -rand(11, 15) * Math.sqrt(h / 800), targetY: h * rand(0.12, 0.45),
      style: Math.random() < 0.6 ? STYLES[lead] : pick(STYLES),
      colors: i % 2 ? PALETTES[lead] : pick(PALETTES),
    }));
    const delays = rockets.map((_, i) => (i < count - finale ? i * 8 + rand(0, 4) : (count - finale) * 8 + 14 + rand(0, 6)));
    const audio = sound ? sfx() : null;
    if (audio) delays.forEach((d) => playLaunch(audio, audio.ctx.currentTime + d / 60));
    let sparks: Spark[] = [];
    let frame = 0, raf = 0;

    const tick = () => {
      frame++;
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      rockets.forEach((r, i) => {
        if (frame < delays[i] || r.y <= r.targetY) return;
        r.y += r.vy; r.vy *= 0.985;
        ctx.fillStyle = r.colors[0];
        ctx.beginPath(); ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2); ctx.fill();
        if (r.y <= r.targetY || r.vy > -2) {
          r.y = r.targetY;
          sparks.push(...burst(r.style, r.x, r.y, r.colors, scale));
          if (audio && !r.boomed) { r.boomed = true; playBoom(audio, audio.ctx.currentTime, r.style === "willow" || r.style === "crossette"); }
        }
      });

      const next: Spark[] = [];
      for (const s of sparks) {
        s.life++; s.vx *= s.drag; s.vy = s.vy * s.drag + s.gravity; s.x += s.vx; s.y += s.vy;
        if (s.life >= s.max) {
          if (s.split) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; next.push({ x: s.x, y: s.y, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, life: 0, max: 35, color: s.color, size: 1.8, drag: 0.96, gravity: 0.05 }); }
          continue;
        }
        ctx.globalAlpha = 1 - s.life / s.max;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        next.push(s);
      }
      ctx.globalAlpha = 1;
      sparks = next;
      const flying = rockets.some((r, i) => frame < delays[i] || r.y > r.targetY);
      if (flying || sparks.length || frame < 20) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, w, h); };
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps -- a sound toggle must not replay the show

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}
