"use client";

import { useEffect, useMemo, useState } from "react";
import { startQuizAction } from "@/app/actions";

export interface ScopeCell {
  domain: string;
  area: string;
  difficulty?: string;
  total: number;
  unseen: number;
}

interface Props {
  exam: string;
  mode: "practice" | "reinforce";
  domains: { id: string; label: string }[];
  areas: { id: string; name: string }[];
  /** Question counts per (domain, area), for the live pool size. */
  cells: ScopeCell[];
  counts: number[];
  submitLabel: string;
  disabled?: boolean;
  /** Domains to start with (for example from a "work on your weakest domain" link); overrides the saved choice. */
  initialDomains?: string[];
  /** Show the difficulty filter (practice sets). */
  difficulty?: boolean;
}

const LEVELS = [["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]] as const;

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:text-ink"}`;

/**
 * Multi-select scope for a session: exam domains as chips (all on = everything), plus an optional
 * study-area picker. The last choice is remembered on this device.
 */
export function ScopePicker({ exam, mode, domains, areas, cells, counts, submitLabel, disabled, initialDomains, difficulty }: Props) {
  const storageKey = `cep-scope:${exam}:${mode}`;
  const preset = initialDomains?.filter((id) => domains.some((d) => d.id === id));
  const [picked, setPicked] = useState<string[]>(() => (preset?.length ? preset : domains.map((d) => d.id)));
  const [pickedAreas, setPickedAreas] = useState<string[]>([]); // empty = all areas
  const [showAreas, setShowAreas] = useState(false);
  const [levels, setLevels] = useState<string[]>([]); // empty = any difficulty

  // Restore after mount (localStorage isn't available during server rendering).
  useEffect(() => {
    if (preset?.length) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (!saved) return;
      const d = (saved.domains as string[]).filter((id) => domains.some((x) => x.id === id));
      const a = (saved.areas as string[]).filter((id) => areas.some((x) => x.id === id));
      /* eslint-disable react-hooks/set-state-in-effect -- one-time restore of a saved preference */
      if (d.length) setPicked(d);
      setPickedAreas(a);
      if (a.length) setShowAreas(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preset only matters on first render
  }, [storageKey, domains, areas]);

  const remember = (d: string[], a: string[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ domains: d, areas: a })); } catch {}
  };

  const toggleDomain = (id: string) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    if (!next.length) return; // at least one domain stays on
    setPicked(next);
    remember(next, pickedAreas);
  };
  const toggleArea = (id: string) => {
    const next = pickedAreas.includes(id) ? pickedAreas.filter((x) => x !== id) : [...pickedAreas, id];
    setPickedAreas(next);
    remember(picked, next);
  };
  const allAreas = () => { setPickedAreas([]); remember(picked, []); };

  const inDomains = cells.filter((c) => picked.includes(c.domain));
  const areaCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of inDomains) m.set(c.area, (m.get(c.area) ?? 0) + c.total);
    return m;
  }, [inDomains]);
  const pool = inDomains.filter((c) => (!pickedAreas.length || pickedAreas.includes(c.area)) && (!levels.length || !c.difficulty || levels.includes(c.difficulty)));
  const toggleLevel = (id: string) => setLevels((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const total = pool.reduce((s, c) => s + c.total, 0);
  const unseen = pool.reduce((s, c) => s + c.unseen, 0);
  const allDomains = picked.length === domains.length;

  return (
    <form action={startQuizAction} className="space-y-3">
      <input type="hidden" name="exam" value={exam} />
      <input type="hidden" name="mode" value={mode} />
      {!allDomains && picked.map((d) => <input key={d} type="hidden" name="domains" value={d} />)}
      {pickedAreas.map((a) => <input key={a} type="hidden" name="areas" value={a} />)}
      {levels.map((l) => <input key={l} type="hidden" name="difficulty" value={l} />)}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Exam domains">
        {domains.map((d) => (
          <button key={d.id} type="button" aria-pressed={picked.includes(d.id)} onClick={() => toggleDomain(d.id)} className={chip(picked.includes(d.id))}>
            {picked.includes(d.id) ? "✓ " : ""}{d.label}
          </button>
        ))}
      </div>

      <div>
        <button type="button" className="text-sm font-bold text-brand" aria-expanded={showAreas} onClick={() => setShowAreas((v) => !v)}>
          {showAreas ? "▾" : "▸"} Pick topics{pickedAreas.length ? ` (${pickedAreas.length} selected)` : " (all)"}
        </button>
        {showAreas && (
          <div className="mt-2 rounded-xl border border-line p-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Topics">
              <button type="button" aria-pressed={!pickedAreas.length} onClick={allAreas} className={chip(!pickedAreas.length)}>All topics</button>
              {areas.filter((a) => areaCounts.get(a.id)).map((a) => (
                <button key={a.id} type="button" aria-pressed={pickedAreas.includes(a.id)} onClick={() => toggleArea(a.id)} className={chip(pickedAreas.includes(a.id))}>
                  {a.name} <span className="font-normal opacity-70">{areaCounts.get(a.id)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {difficulty && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Difficulty">
          <span className="text-sm font-bold text-muted">Difficulty:</span>
          <button type="button" aria-pressed={!levels.length} onClick={() => setLevels([])} className={chip(!levels.length)}>Any</button>
          {LEVELS.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={levels.includes(id)} onClick={() => toggleLevel(id)} className={chip(levels.includes(id))}>
              {levels.includes(id) ? "✓ " : ""}{label}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-muted" aria-live="polite">
        {total ? <><b className="text-ink">{total}</b> questions in scope · {unseen} you haven&apos;t seen</> : "No questions in this scope. Pick more topics or domains."}
      </p>

      <div className="flex flex-wrap gap-2">
        <select name="count" className="input !w-auto" aria-label="Number of questions">
          {counts.map((n) => <option key={n} value={n}>{n === 5 ? "Quick 5" : `${n} questions`}</option>)}
        </select>
        <button className="btn-primary flex-1" disabled={disabled || !total}>{submitLabel}</button>
      </div>
    </form>
  );
}
