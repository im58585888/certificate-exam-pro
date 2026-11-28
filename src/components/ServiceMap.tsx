"use client";

import { useLayoutEffect, useRef, useState } from "react";
import s from "./ServiceMap.module.css";

// The study sheet's heat map: one tile per AWS service, sized by questions to fix and colored by how often the learner
// gets that service right, clustered by category (or one map of all services). Mia's focus services carry 1-2-3 badges.
// Tile layout is a squarified treemap, so a tile's area really is its share of the mistakes.

export interface MapTile {
  service: string;
  category: string;
  toFix: number;
  right: number;
  total: number;
  focus?: number;
}

type Box = { x: number; y: number; w: number; h: number };
type Placed<T> = T & Box;

function squarify<T extends { v: number }>(items: T[], box: Box): Placed<T>[] {
  const out: Placed<T>[] = [];
  let rest = [...items].filter((i) => i.v > 0).sort((a, b) => b.v - a.v);
  let { x, y, w, h } = box;
  while (rest.length && w > 0 && h > 0) {
    const scale = (w * h) / rest.reduce((t, a) => t + a.v, 0);
    const side = Math.min(w, h);
    const worst = (row: T[]) => {
      const sum = row.reduce((t, a) => t + a.v * scale, 0);
      const max = Math.max(...row.map((a) => a.v * scale));
      const min = Math.min(...row.map((a) => a.v * scale));
      return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
    };
    const row = [rest[0]];
    while (row.length < rest.length && worst([...row, rest[row.length]]) <= worst(row)) row.push(rest[row.length]);
    const sum = row.reduce((t, a) => t + a.v * scale, 0);
    if (w >= h) {
      const cw = sum / h;
      let cy = y;
      for (const r of row) { const ch = (r.v * scale) / cw; out.push({ ...r, x, y: cy, w: cw, h: ch }); cy += ch; }
      x += cw; w -= cw;
    } else {
      const rh = sum / w;
      let cx = x;
      for (const r of row) { const rw = (r.v * scale) / rh; out.push({ ...r, x: cx, y, w: rw, h: rh }); cx += rw; }
      y += rh; h -= rh;
    }
    rest = rest.slice(row.length);
  }
  return out;
}

/** Five steps from "under 25% right" to "85% and up". */
export const SCORE_STEPS = [
  { max: 25, label: "under 25%" }, { max: 50, label: "25–50%" }, { max: 70, label: "50–70%" }, { max: 85, label: "70–85%" }, { max: 101, label: "85%+" },
];
const stepOf = (pct: number) => SCORE_STEPS.findIndex((st) => pct < st.max);
const shortName = (n: string) => n.replace(/^(Amazon|AWS) /, "");
type Item = MapTile & { v: number; pct: number };

export function ServiceMap({ tiles, selected, onSelect }: { tiles: MapTile[]; selected: string | null; onSelect: (service: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [mode, setMode] = useState<"category" | "all">("category");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = size.w > 0 && size.w < 560;
  let items: Item[] = tiles.map((t) => ({ ...t, v: t.toFix, pct: t.total ? Math.round((t.right / t.total) * 100) : 0 }));
  // On phones, services with a single mistake leave the map for a row of chips below it, so no tile is too small to tap.
  const singles = narrow && items.filter((i) => i.toFix === 1 && !i.focus).length > 3 ? items.filter((i) => i.toFix === 1 && !i.focus) : [];
  if (singles.length) items = items.filter((i) => !singles.includes(i));

  const G = 3;
  const placed: (Placed<Item> & { i: number })[] = [];
  const clusters: (Box & { name: string; v: number })[] = [];
  if (size.w && size.h) {
    if (mode === "category") {
      const cats = [...new Set(items.map((i) => i.category))].map((name) => ({ name, v: items.filter((i) => i.category === name).reduce((t, a) => t + a.v, 0) }));
      for (const c of squarify(cats, { x: 0, y: 0, w: size.w, h: size.h })) {
        clusters.push(c);
        // Room for the cluster's label when it fits; a cluster too small for one uses its whole box for tiles.
        const roomy = c.w > 70 && c.h > 70;
        const inner = roomy
          ? { x: c.x + G + 4, y: c.y + G + 22, w: c.w - 2 * G - 8, h: c.h - 2 * G - 26 }
          : { x: c.x + G + 1, y: c.y + G + 1, w: c.w - 2 * G - 2, h: c.h - 2 * G - 2 };
        squarify(items.filter((i) => i.category === c.name), inner).forEach((p) => placed.push({ ...p, i: placed.length }));
      }
    } else {
      squarify(items, { x: 0, y: 0, w: size.w, h: size.h }).forEach((p) => placed.push({ ...p, i: placed.length }));
    }
  }

  return (
    <div>
      <div className={s.bar}>
        <p className={s.hint}>Bigger tile = more to fix · color = how often you get it right{tiles.some((t) => t.focus) ? " · numbers = Mia's focus order" : ""}</p>
        <div className={s.seg} role="group" aria-label="Map view">
          <button type="button" aria-pressed={mode === "category"} onClick={() => setMode("category")}>By category</button>
          <button type="button" aria-pressed={mode === "all"} onClick={() => setMode("all")}>All services</button>
        </div>
      </div>
      <div ref={ref} className={s.map} style={{ height: Math.min(560, Math.max(320, 260 + items.length * 9)) + (narrow ? 60 : 0) }} role="list" aria-label="AWS services by questions to fix">
        {mode === "category" && clusters.map((c) => (
          <div key={c.name} className={s.cluster} style={{ left: c.x + G, top: c.y + G, width: c.w - 2 * G, height: c.h - 2 * G }} aria-hidden="true">
            {c.w > 70 && c.h > 70 && <span className={s.clusterLabel}>{c.name} · {c.v}</span>}
          </div>
        ))}
        {placed.map((t) => {
          const w = t.w - 4, h = t.h - 4;
          const big = w > 110 && h > 76, mid = w > 58 && h > 38;
          const label = `${t.service}: ${t.toFix} to fix, ${t.right} of ${t.total} right${t.focus ? `, Mia's focus number ${t.focus}` : ""}`;
          return (
            <button key={t.service} type="button" role="listitem" title={label} aria-label={label}
              className={`${s.tile} ${selected === t.service ? s.selected : ""}`}
              data-step={stepOf(t.pct)}
              style={{ left: t.x + 2, top: t.y + 2, width: w, height: h, animationDelay: `${Math.min(t.i * 35, 700)}ms` }}
              onClick={() => onSelect(selected === t.service ? null : t.service)}>
              {t.focus && <span className={s.badge}>{t.focus}</span>}
              {big ? (
                <>
                  <span className={s.name} style={{ paddingRight: t.focus ? 20 : 0 }}>{t.service}</span>
                  <span className={s.count}>{t.toFix}<small> to fix</small></span>
                  <span className={s.sub}>{t.right}/{t.total} right</span>
                </>
              ) : mid ? (
                <>
                  <span className={s.name} style={{ fontSize: w < 90 ? 11 : 12, paddingRight: t.focus ? 20 : 0 }}>{shortName(t.service)}</span>
                  <span className={s.sub}>{t.toFix} to fix</span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
      {singles.length > 0 && (
        <div className={s.moreList} role="group" aria-label="Services with one question to fix">
          <span className={s.moreLabel}>Also 1 to fix each:</span>
          {singles.map((m) => (
            <button key={m.service} type="button" data-step={stepOf(m.pct)} aria-pressed={selected === m.service} onClick={() => onSelect(selected === m.service ? null : m.service)}>{shortName(m.service)}</button>
          ))}
        </div>
      )}
      <div className={s.legend} aria-hidden="true">
        <span>Score:</span>
        {SCORE_STEPS.map((st, i) => <span key={st.label} className={s.key}><i data-step={i} />{st.label}</span>)}
      </div>
    </div>
  );
}
