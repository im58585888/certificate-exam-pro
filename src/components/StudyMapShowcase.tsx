"use client";

import { useEffect, useRef, useState } from "react";
import { MiaPose } from "./Mia";
import { ServiceMap, type MapTile } from "./ServiceMap";

// Landing-page demo of the study sheet's heat map with sample data: it grows in when scrolled into view, and tapping a
// tile shows what Mia would say about it. Nothing here calls the AI or reads anyone's results.

const DEMO: [string, string, number, number, number, number?][] = [
  ["Amazon S3", "Storage", 7, 29, 45, 1], ["Amazon EBS", "Storage", 3, 1, 6], ["Amazon EFS", "Storage", 2, 3, 5],
  ["Amazon VPC", "Networking", 6, 11, 21, 2], ["Amazon CloudFront", "Networking", 2, 5, 7], ["Elastic Load Balancing", "Networking", 2, 6, 9],
  ["Amazon DynamoDB", "Database", 5, 4, 11, 3], ["Amazon RDS", "Database", 3, 5, 10], ["Amazon Aurora", "Database", 2, 3, 5],
  ["AWS KMS", "Security", 3, 2, 7], ["AWS IAM", "Security", 2, 8, 12], ["AWS CloudHSM", "Security", 2, 0, 2],
  ["Amazon EC2", "Compute", 2, 9, 14], ["AWS Lambda", "Compute", 2, 3, 6],
  ["Amazon SQS", "Integration", 2, 4, 7], ["AWS CloudTrail", "Management", 3, 1, 5],
];
const TILES: MapTile[] = DEMO.map(([service, category, toFix, right, total, focus]) => ({ service, category, toFix, right, total, focus }));

const SAYS: Record<string, string> = {
  "Amazon S3": "You know the storage classes. What's costing you is bucket policies: enforcing encryption, HTTPS and one KMS key.",
  "Amazon VPC": "Private access trips you up: gateway versus interface endpoints, and when traffic leaves the VPC.",
  "Amazon DynamoDB": "Partition keys and capacity modes. Pick keys with many distinct values, and switch to provisioned once traffic is steady.",
  "AWS KMS": "Key policies versus IAM policies. Cross-account decrypt needs both.",
  "AWS CloudHSM": "When a question says single-tenant or AWS must not access the keys, it's CloudHSM, not KMS.",
};

export function StudyMapShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [selected, setSelected] = useState<string | null>("Amazon S3");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const t = TILES.find((x) => x.service === selected);

  return (
    <div ref={ref} className="mx-auto grid max-w-6xl gap-6 text-left lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
      <div className="card overflow-hidden p-5">
        <div className="flex items-end gap-3">
          <MiaPose pose="reviewing" height={130} />
          <p className="mb-2 rounded-2xl rounded-bl-sm bg-brand-soft px-3.5 py-2.5 text-[15px] font-semibold leading-snug text-ink">
            You&apos;re losing the most points on <span className="text-brand">how to protect data</span>. Fix these three first:
          </p>
        </div>
        <ol className="mt-4 grid gap-2">
          {TILES.filter((x) => x.focus).sort((a, b) => a.focus! - b.focus!).map((x) => (
            <li key={x.service}>
              <button type="button" onClick={() => setSelected(x.service)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${selected === x.service ? "border-brand bg-brand-soft" : "border-line bg-bg hover:border-brand"}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs text-on-brand">{x.focus}</span>
                {x.service} <span className="ml-auto text-xs font-semibold text-muted">{x.toFix} to fix</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-4 min-h-[4.5rem] rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-soft" aria-live="polite">
          {t ? <><b className="text-ink">Mia on {t.service}:</b> {SAYS[t.service] ?? `${t.toFix} questions to fix here. Tap it on your own sheet to see each one, your answer and the rule to remember.`}</> : "Tap any tile to see what Mia says about it."}
        </p>
      </div>
      <div className="card p-4 sm:p-5">
        <p className="mb-3 text-sm font-bold text-brand">Try it: tap a tile</p>
        {seen ? <ServiceMap tiles={TILES} selected={selected} onSelect={setSelected} /> : <div style={{ height: 460 }} />}
      </div>
    </div>
  );
}
