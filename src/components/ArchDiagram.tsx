"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cleanDiagram, type ArchDiagram as Diagram, type ArchNode, type ArchZone, type NodeKind } from "@/lib/arch";
import s from "./ArchDiagram.module.css";

// Draws the breakdown's architecture diagram. Boxes are laid out with flexbox (so text wraps and narrow columns stack
// top to bottom); the arrows are then measured from where the boxes landed and drawn on top in SVG.

type Item = { type: "zone"; zone: ArchZone; children: Item[]; rank: number } | { type: "node"; node: ArchNode; rank: number };

/** Groups boxes into their boundaries and orders siblings so arrows mostly run forwards. */
function buildTree(d: Diagram): Item[] {
  const rank = new Map(d.nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < d.nodes.length; pass++) {
    for (const l of d.links) {
      const r = (rank.get(l.from) ?? 0) + 1;
      if (r > (rank.get(l.to) ?? 0) && r < d.nodes.length) rank.set(l.to, r);
    }
  }
  const build = (parent: string | null): Item[] => {
    const items: Item[] = [
      ...d.zones.filter((z) => z.parent === parent).map((zone) => {
        const children = build(zone.id);
        return { type: "zone" as const, zone, children, rank: Math.min(...children.map((c) => c.rank), 99) };
      }),
      ...d.nodes.filter((n) => n.zone === parent).map((node) => ({ type: "node" as const, node, rank: rank.get(node.id) ?? 0 })),
    ];
    return items.filter((i) => i.type === "node" || i.children.length).sort((a, b) => a.rank - b.rank);
  };
  return build(null);
}

const ICONS: Record<NodeKind, ReactNode> = {
  users: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  compute: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M10 2v4M14 2v4M10 18v4M14 18v4M2 10h4M2 14h4M18 10h4M18 14h4" /></>,
  storage: <><path d="M4 6h16l-1.6 13a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z" /><path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3" /></>,
  database: <><ellipse cx="12" cy="5.5" rx="7" ry="2.8" /><path d="M5 5.5v13c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-13M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" /></>,
  network: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.6 5.7 3.6 9s-1.1 6.3-3.6 9c-2.5-2.7-3.6-5.7-3.6-9S9.5 5.7 12 3" /></>,
  security: <><path d="M12 3l7 3v5.5c0 4.4-3 7.9-7 9.5-4-1.6-7-5.1-7-9.5V6z" /><path d="M9 12l2 2 4-4" /></>,
  integration: <><rect x="3" y="5" width="18" height="4" rx="1.5" /><rect x="3" y="10" width="18" height="4" rx="1.5" /><rect x="3" y="15" width="18" height="4" rx="1.5" /></>,
  analytics: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  other: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></>,
  decision: null,
};

function NodeBox({ n }: { n: ArchNode }) {
  return (
    <div className={s.node} data-kind={n.kind} data-node={n.id} style={{ "--c": `var(--c-${n.kind})` } as React.CSSProperties}>
      <span className={s.icon} aria-hidden>
        {n.kind === "decision" ? "?" : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[n.kind]}</svg>
        )}
      </span>
      <span className="min-w-0">
        <span className={s.label}>{n.label}</span>
        {n.note && <span className={s.note}>{n.note}</span>}
        {n.tag && <span className={s.tag}>{n.tag}</span>}
      </span>
    </div>
  );
}

function Items({ items }: { items: Item[] }) {
  return (
    <div className={s.row}>
      {items.map((i) => i.type === "node" ? <NodeBox key={i.node.id} n={i.node} /> : (
        <div key={i.zone.id} className={s.zone} data-kind={i.zone.kind}>
          <span className={s.zoneLabel}>{i.zone.label}</span>
          <Items items={i.children} />
        </div>
      ))}
    </div>
  );
}

type Wire = { d: string; x: number; y: number; decision: boolean; badge: string; step: number };

/** An elbow route between two boxes: leaves and enters on the sides facing each other. */
function route(a: DOMRect, b: DOMRect, origin: DOMRect): { d: string; x: number; y: number } {
  const ax = a.left - origin.left, ay = a.top - origin.top, bx = b.left - origin.left, by = b.top - origin.top;
  const acx = ax + a.width / 2, acy = ay + a.height / 2, bcx = bx + b.width / 2, bcy = by + b.height / 2;
  const gapX = Math.max(bx - (ax + a.width), ax - (bx + b.width));
  const gapY = Math.max(by - (ay + a.height), ay - (by + b.height));
  if (gapX >= gapY) {
    const right = bcx > acx;
    const sx = right ? ax + a.width : ax, ex = right ? bx - 2 : bx + b.width + 2;
    const mx = (sx + ex) / 2;
    return { d: `M${sx},${acy} H${mx} V${bcy} H${ex}`, x: mx, y: (acy + bcy) / 2 };
  }
  const down = bcy > acy;
  const sy = down ? ay + a.height : ay, ey = down ? by - 2 : by + b.height + 2;
  const my = (sy + ey) / 2;
  return { d: `M${acx},${sy} V${my} H${bcx} V${ey}`, x: (acx + bcx) / 2, y: my };
}

export function ArchDiagram({ diagram }: { diagram: Diagram }) {
  const d = useMemo(() => cleanDiagram(diagram), [diagram]);
  const tree = useMemo(() => (d ? buildTree(d) : []), [d]);
  const canvas = useRef<HTMLDivElement>(null);
  const [wires, setWires] = useState<Wire[]>([]);

  // Arrows with a label or an explanation are numbered and explained below as steps; the decision arrow gets a "?".
  const labelled = useMemo(() => {
    let n = 0;
    return (d?.links ?? []).map((l) => ({ ...l, badge: l.decision ? "?" : l.label || l.explain ? String(++n) : "" }));
  }, [d]);
  // Tapping a numbered badge on the diagram highlights its step below and scrolls it into view.
  const [active, setActive] = useState<number | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pick = (i: number) => {
    setActive(i);
    stepRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const measure = useMemo(() => () => {
    const el = canvas.current;
    if (!el) return;
    const origin = el.getBoundingClientRect();
    const box = (id: string) => el.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`)?.getBoundingClientRect();
    setWires(labelled.flatMap((l) => {
      const a = box(l.from), b = box(l.to);
      return a && b ? [{ ...route(a, b, origin), decision: l.decision, badge: l.badge, step: labelled.indexOf(l) }] : [];
    }));
  }, [labelled]);

  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  if (!d) return null;
  const key = labelled.filter((l) => l.badge);
  return (
    <div className={s.wrap}>
      <div ref={canvas} className={s.canvas} role="img" aria-label={`Diagram: ${d.caption || "how the pieces of the scenario connect"}`}>
        <Items items={tree} />
        <svg className={s.wires} aria-hidden>
          <defs>
            <marker id="arch-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className={s.headNormal} /></marker>
            <marker id="arch-head-q" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className={s.headDecision} /></marker>
          </defs>
          {wires.map((w, i) => <path key={i} d={w.d} className={s.wire} data-decision={w.decision} markerEnd={`url(#${w.decision ? "arch-head-q" : "arch-head"})`} />)}
        </svg>
        {wires.map((w, i) => w.badge && (
          <button key={i} type="button" className={s.badge} data-decision={w.decision} data-active={active === w.step} style={{ left: w.x, top: w.y }}
            onClick={() => pick(w.step)} aria-label={`Show step ${w.badge}`} tabIndex={-1}>{w.badge}</button>
        ))}
      </div>
      {(key.length > 0 || d.caption) && (
        <div className={s.key}>
          {d.caption && <p className="text-muted">{d.caption}</p>}
          {key.length > 0 && <p className={s.keyTitle}>Step by step</p>}
          {key.map((l) => {
            const i = labelled.indexOf(l);
            const from = d.nodes.find((n) => n.id === l.from)?.label ?? l.from;
            const to = d.nodes.find((n) => n.id === l.to)?.label ?? l.to;
            return (
              <div key={i} ref={(el) => { stepRefs.current[i] = el; }} className={s.keyRow} data-active={active === i} onClick={() => setActive(i)}>
                <span className={s.badge} data-decision={l.decision} aria-hidden>{l.badge}</span>
                <span className="min-w-0">
                  <span className="block">
                    <b className="text-ink">{from} → {to}</b>
                    {l.decision ? <> · <b className="text-ink">{l.label || "This connection"}</b>: the piece the question asks you to choose</> : l.label && <> · {l.label}</>}
                  </span>
                  {l.explain && <span className="mt-0.5 block leading-relaxed">{l.explain}</span>}
                </span>
              </div>
            );
          })}
          {d.nodes.some((n) => n.kind === "decision") && !key.some((l) => l.decision) && (
            <div className={s.keyRow}><span className={s.badge} data-decision aria-hidden>?</span><span>The dashed box is the piece the question asks you to choose</span></div>
          )}
          {d.nodes.some((n) => n.role) && (
            <>
              <p className={s.keyTitle}>The pieces</p>
              <ul className="grid gap-1">
                {d.nodes.filter((n) => n.role).map((n) => (
                  <li key={n.id}><b className="text-ink">{n.label}</b>: {n.role}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** The diagram with an "Enlarge" button that opens it full width. */
export function ArchFigure({ diagram }: { diagram: Diagram }) {
  const [big, setBig] = useState(false);
  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setBig(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [big]);
  return (
    <figure className="rounded-xl border border-line bg-bg p-3">
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={() => setBig(true)} className="text-xs font-bold text-brand hover:underline">⤢ Enlarge</button>
      </div>
      <ArchDiagram diagram={diagram} />
      {big && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Diagram" onClick={(e) => { if (e.target === e.currentTarget) setBig(false); }}>
          <div className="card relative mx-auto my-6 max-w-5xl p-5 sm:p-7">
            <button type="button" onClick={() => setBig(false)} aria-label="Close" className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2">✕</button>
            <ArchDiagram diagram={diagram} />
          </div>
        </div>,
        document.body,
      )}
    </figure>
  );
}
