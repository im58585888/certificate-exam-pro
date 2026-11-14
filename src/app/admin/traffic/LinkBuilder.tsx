"use client";

import { useState } from "react";

// Builds UTM-tagged links per platform so each ad or post shows up as its own row under Campaigns.
const PLATFORMS = [
  ["facebook", "📘 Facebook"],
  ["instagram", "📸 Instagram"],
  ["threads", "🧵 Threads"],
  ["reddit", "👽 Reddit"],
] as const;

const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function LinkBuilder({ origin }: { origin: string }) {
  const [campaign, setCampaign] = useState("ai-tutor-launch");
  const [content, setContent] = useState("");
  const [page, setPage] = useState("/");
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const linkFor = (source: string) => {
    const url = new URL(page.startsWith("/") ? page : `/${page}`, origin);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", paid ? "paid" : "social");
    if (slug(campaign)) url.searchParams.set("utm_campaign", slug(campaign));
    if (slug(content)) url.searchParams.set("utm_content", slug(content));
    return url.toString();
  };
  const copy = async (source: string) => {
    try { await navigator.clipboard.writeText(linkFor(source)); setCopied(source); setTimeout(() => setCopied(null), 1500); } catch { /* clipboard blocked */ }
  };

  return (
    <section className="card p-5">
      <h2 className="font-extrabold">Tracked link builder</h2>
      <p className="text-xs text-muted">Use a different link for each ad or post. Visits, trials and sign-ups then show up under that campaign above.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold">Campaign<input className="input mt-1" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="ai-tutor-launch" /></label>
        <label className="text-sm font-semibold">Post or ad name <span className="font-normal text-muted">(optional)</span><input className="input mt-1" value={content} onChange={(e) => setContent(e.target.value)} placeholder="fireworks-video" /></label>
        <label className="text-sm font-semibold">Page<input className="input mt-1" value={page} onChange={(e) => setPage(e.target.value)} placeholder="/" /></label>
        <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> This is a paid ad</label>
      </div>
      <ul className="mt-4 space-y-2">
        {PLATFORMS.map(([source, label]) => (
          <li key={source} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
            <span className="w-28 text-sm font-bold">{label}</span>
            <code className="min-w-0 flex-1 truncate text-xs text-soft">{linkFor(source)}</code>
            <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => copy(source)}>{copied === source ? "Copied ✓" : "Copy"}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
