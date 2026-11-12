"use client";

import { useEffect, useRef } from "react";

// A short fireworks show over the page when a practice answer is correct. Five styles take turns
// (starting at a random one) so it doesn't get stale. Skipped for people who prefer reduced motion.

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

export function Fireworks({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offset = useRef(Math.floor(Math.random() * STYLES.length));

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

    const style = STYLES[(offset.current + trigger) % STYLES.length];
    const colors = PALETTES[(offset.current + trigger) % PALETTES.length];
    const count = style === "crossette" ? 2 : 3;
    const rockets: Rocket[] = Array.from({ length: count }, (_, i) => ({
      x: w * ((i + 1) / (count + 1)) + rand(-40, 40), y: h + 10, vy: -rand(11, 14) * Math.sqrt(h / 800), targetY: h * rand(0.18, 0.4), style, colors,
    }));
    const delays = rockets.map((_, i) => i * 9);
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
        if (r.y <= r.targetY || r.vy > -2) { r.y = r.targetY; sparks.push(...burst(r.style, r.x, r.y, r.colors, scale)); }
      });

      const next: Spark[] = [];
      for (const s of sparks) {
        s.life++; s.vx *= s.drag; s.vy = s.vy * s.drag + s.gravity; s.x += s.vx; s.y += s.vy;
        if (s.life >= s.max) {
          if (s.split) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; next.push({ x: s.x, y: s.y, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, life: 0, max: 35, color: pick(colors), size: 1.8, drag: 0.96, gravity: 0.05 }); }
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
  }, [trigger]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}
