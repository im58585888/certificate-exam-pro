"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Shared hover tooltip: value leads (strong), label follows (muted). Same content on focus as on hover.
interface Tip { x: number; y: number; value: string; label: string; }

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left: tip.x, top: tip.y - 8 }}>
      <b className="block text-sm text-ink">{tip.value}</b>
      <span className="text-muted">{tip.label}</span>
    </div>
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

// ---------- Domain mastery: horizontal bars with a passing reference line ----------

export interface DomainRow { id: string; label: string; weight: number; score: number | null; attempts: number; }

export function DomainBars({ rows, passLine }: { rows: DomainRow[]; passLine: number }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const show = (el: HTMLElement, r: DomainRow) => {
    const box = boxRef.current!.getBoundingClientRect(), b = el.getBoundingClientRect();
    setTip({ x: b.left - box.left + b.width / 2, y: b.top - box.top,
      value: r.score === null ? "Not started" : `${Math.round(r.score * 100)}% mastery`,
      label: `${r.label} · ${r.attempts} answered · ${Math.round(r.weight * 100)}% of exam` });
  };
  return (
    <div ref={boxRef} className="relative space-y-4">
      {rows.map((r) => (
        <div key={r.id}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold text-ink">{r.label}</span>
            <span className="text-xs text-muted">{Math.round(r.weight * 100)}% of exam</span>
          </div>
          <div className="relative mt-1.5 flex h-6 items-center">
            <div className="absolute inset-y-0 left-0 w-full border-l border-grid" />
            <div className="absolute inset-y-[-3px] border-l border-dashed border-muted/60" style={{ left: `${passLine * 100}%` }} aria-hidden />
            {r.score === null ? (
              <span className="relative pl-2 text-xs text-muted">No answers yet</span>
            ) : (
              <>
                <button type="button" aria-label={`${r.label}: ${Math.round(r.score * 100)}% mastery`}
                  className="relative h-5 rounded-r bg-chart outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand"
                  style={{ width: `${Math.max(1, r.score * 100)}%` }}
                  onPointerEnter={(e) => show(e.currentTarget, r)} onPointerLeave={() => setTip(null)}
                  onFocus={(e) => show(e.currentTarget, r)} onBlur={() => setTip(null)} />
                <span className="relative ml-2 text-sm font-bold text-ink">{Math.round(r.score * 100)}%</span>
              </>
            )}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">Dashed line: {Math.round(passLine * 100)}%, roughly where a passing score sits.</p>
      <Tooltip tip={tip} />
    </div>
  );
}

// ---------- Daily activity: columns (volume) and a line (accuracy), as two charts sharing an x-axis ----------

export interface DayPoint { date: string; answered: number; correct: number; }

const M = { l: 34, r: 10, t: 12, b: 24 };
const H = 180;

function niceMax(v: number) {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

const dayLabel = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Frame({ w, yTicks, fmt, days, children }: { w: number; yTicks: number[]; fmt: (v: number) => string; days: DayPoint[]; children: ReactNode }) {
  const iw = w - M.l - M.r, slot = iw / days.length;
  const yMax = yTicks[yTicks.length - 1];
  const y = (v: number) => M.t + (H - M.t - M.b) * (1 - v / yMax);
  return (
    <svg width={w} height={H} className="block overflow-visible">
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
          <text x={M.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular-nums">{fmt(t)}</text>
        </g>
      ))}
      {days.map((d, i) => (i % 7 === (days.length - 1) % 7 ? (
        <text key={d.date} x={M.l + slot * (i + 0.5)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted)">{dayLabel(d.date)}</text>
      ) : null))}
      {children}
    </svg>
  );
}

export function DailyColumns({ days }: { days: DayPoint[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...days.map((d) => d.answered), 1));
  const ticks = [0, max / 2, max];
  const iw = w - M.l - M.r, slot = iw / days.length, bw = Math.min(24, Math.max(3, slot - 2));
  const y = (v: number) => M.t + (H - M.t - M.b) * (1 - v / max);
  const base = y(0);
  return (
    <div ref={ref} className="relative">
      {w > 0 && (
        <Frame w={w} yTicks={ticks} fmt={(v) => String(Math.round(v))} days={days}>
          {days.map((d, i) => {
            const x = M.l + slot * i + (slot - bw) / 2, top = y(d.answered), h = base - top, r = Math.min(4, h, bw / 2);
            return (
              <g key={d.date}>
                {d.answered > 0 && (
                  <path d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z`}
                    fill="var(--chart)" opacity={hover === null || hover === i ? 1 : 0.55} />
                )}
                <rect x={M.l + slot * i} y={M.t} width={slot} height={H - M.t - M.b} fill="transparent" tabIndex={0}
                  aria-label={`${dayLabel(d.date)}: ${d.answered} answered`}
                  onPointerEnter={() => { setHover(i); setTip({ x: x + bw / 2, y: Math.min(top, base - 2), value: `${d.answered} answered`, label: `${dayLabel(d.date)}${d.answered ? ` · ${Math.round((d.correct / d.answered) * 100)}% correct` : ""}` }); }}
                  onFocus={() => { setHover(i); setTip({ x: x + bw / 2, y: Math.min(top, base - 2), value: `${d.answered} answered`, label: dayLabel(d.date) }); }}
                  onPointerLeave={() => { setHover(null); setTip(null); }} onBlur={() => { setHover(null); setTip(null); }} />
              </g>
            );
          })}
        </Frame>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

export function AccuracyLine({ days }: { days: DayPoint[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [idx, setIdx] = useState<number | null>(null);
  const iw = w - M.l - M.r, slot = iw / days.length;
  const y = (v: number) => M.t + (H - M.t - M.b) * (1 - v);
  const pts = days.map((d, i) => ({ i, d, x: M.l + slot * (i + 0.5), v: d.answered ? d.correct / d.answered : null })).filter((p) => p.v !== null) as { i: number; d: DayPoint; x: number; v: number }[];
  const path = pts.map((p, k) => `${k ? "L" : "M"}${p.x},${y(p.v)}`).join(" ");
  const nearest = (px: number) => pts.reduce((a, b) => (Math.abs(b.x - px) < Math.abs(a.x - px) ? b : a), pts[0]);
  const active = idx === null ? null : pts.find((p) => p.i === idx) ?? null;
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} className="relative">
      {w > 0 && (
        <Frame w={w} yTicks={[0, 0.5, 1]} fmt={(v) => `${v * 100}%`} days={days}>
          {pts.length > 1 && <path d={`${path} L${last.x},${y(0)} L${pts[0].x},${y(0)} Z`} fill="var(--chart)" opacity={0.1} />}
          <path d={path} fill="none" stroke="var(--chart)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active && <line x1={active.x} x2={active.x} y1={M.t} y2={H - M.b} stroke="var(--muted)" strokeWidth={1} />}
          {pts.map((p) => (
            <circle key={p.i} cx={p.x} cy={y(p.v)} r={p === active || p === last ? 5 : 4} fill="var(--chart)" stroke="var(--surface)" strokeWidth={2} />
          ))}
          {last && <text x={last.x} y={y(last.v) - 10} textAnchor="end" fontSize={12} fontWeight={700} fill="var(--ink)">{Math.round(last.v * 100)}%</text>}
          {pts.length > 0 && (
            <rect x={M.l} y={M.t} width={iw} height={H - M.t - M.b} fill="transparent" tabIndex={0}
              aria-label="Daily accuracy chart. Use the table view for exact values."
              onPointerMove={(e) => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setIdx(nearest(e.clientX - r.left).i); }}
              onPointerLeave={() => setIdx(null)} onFocus={() => setIdx(last.i)} onBlur={() => setIdx(null)}
              onKeyDown={(e) => {
                const k = pts.findIndex((p) => p.i === idx);
                if (e.key === "ArrowLeft" && k > 0) setIdx(pts[k - 1].i);
                if (e.key === "ArrowRight" && k < pts.length - 1) setIdx(pts[k + 1].i);
              }} />
          )}
        </Frame>
      )}
      {pts.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-muted">Answer questions to see your trend.</p>}
      <Tooltip tip={active ? { x: active.x, y: y(active.v), value: `${Math.round(active.v * 100)}% correct`, label: `${dayLabel(active.d.date)} · ${active.d.correct}/${active.d.answered}` } : null} />
    </div>
  );
}
