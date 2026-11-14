import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { one, query } from "./db";

// Cookie-free traffic analytics. A visitor is a hash of IP + browser + today's date, so the same person counts once a day,
// can't be followed across days, and raw IPs are never stored. Conversions (trial, sign-up, waitlist, checkout) are tied to
// the same-day visitor, so each one can be credited to the ad, post or site that brought the visit.

export type ConversionKind = "trial" | "signup" | "waitlist" | "checkout";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|meta-external|embedly|headless|lighthouse|python|curl|wget|httpclient|axios|node-fetch|vercel/i;
const VISIT_GAP_MIN = 30;
/** Days (the "once a day" visitor count, the daily chart, the date ranges) follow this time zone, not UTC. */
export const STATS_TZ = process.env.STATS_TIMEZONE || "America/Los_Angeles";

/** Referrer host or utm_source → a channel name the dashboard groups by. */
const SOURCES: [RegExp, string][] = [
  [/(^|\.)(facebook|fb)\.(com|me)$|^fb$|^facebook$/, "facebook"],
  [/(^|\.)instagram\.com$|^ig$|^instagram$/, "instagram"],
  [/(^|\.)threads\.(net|com)$|^threads$/, "threads"],
  [/(^|\.)reddit\.com$|^redd\.it$|^reddit$/, "reddit"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$|^twitter$|^x$/, "x"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$|^linkedin$/, "linkedin"],
  [/(^|\.)youtube\.com$|^youtu\.be$|^youtube$/, "youtube"],
  [/(^|\.)google\.[a-z.]+$|^google$/, "google"],
  [/(^|\.)bing\.com$|^bing$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)(chatgpt\.com|openai\.com|claude\.ai|perplexity\.ai|gemini\.google\.com)$/, "ai-assistant"],
];
const SOCIAL = new Set(["facebook", "instagram", "threads", "reddit", "x", "linkedin", "youtube"]);
const SEARCH = new Set(["google", "bing", "duckduckgo"]);

function channel(name: string): string {
  const n = name.toLowerCase().replace(/^www\./, "").replace(/^(l|lm|m|out|old|new)\./, "");
  return SOURCES.find(([re]) => re.test(n))?.[1] ?? n;
}

export interface Hit {
  path: string;
  referrer?: string;
  utm?: { source?: string; medium?: string; campaign?: string; content?: string };
  clickId?: "fbclid" | "gclid" | "rdt_cid";
  width?: number;
}

interface Attribution { source: string; medium: string; campaign: string | null; content: string | null; referrerHost: string | null }

export function attribute(hit: Hit, ownHost: string): Attribution | null {
  const clip = (v?: string) => v?.trim().toLowerCase().slice(0, 80) || null;
  let refHost: string | null = null;
  try { refHost = hit.referrer ? new URL(hit.referrer).hostname.toLowerCase() : null; } catch { /* ignore bad referrers */ }
  if (refHost === ownHost) refHost = null;

  const utmSource = clip(hit.utm?.source);
  if (utmSource) {
    const source = channel(utmSource);
    const medium = clip(hit.utm?.medium) ?? (SOCIAL.has(source) ? "social" : "referral");
    return { source, medium, campaign: clip(hit.utm?.campaign), content: clip(hit.utm?.content), referrerHost: refHost };
  }
  // Click ids without UTM tags. Meta adds fbclid to every outbound link, organic posts included, so it only proves the
  // platform; Google's gclid and Reddit's rdt_cid come from their ads.
  if (hit.clickId) {
    const source = hit.clickId === "gclid" ? "google" : hit.clickId === "rdt_cid" ? "reddit" : refHost ? channel(refHost) : "facebook";
    return { source, medium: hit.clickId === "fbclid" ? "social" : "paid", campaign: null, content: null, referrerHost: refHost };
  }
  if (refHost) {
    const source = channel(refHost);
    const medium = SOCIAL.has(source) ? "social" : SEARCH.has(source) ? "organic" : "referral";
    return { source, medium, campaign: null, content: null, referrerHost: refHost };
  }
  return null;
}

function deviceOf(ua: string, width?: number): { device: string; os: string } {
  const os = /iphone|ipad|ios/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /windows/i.test(ua) ? "Windows" : /mac os/i.test(ua) ? "macOS" : /cros/i.test(ua) ? "ChromeOS" : /linux/i.test(ua) ? "Linux" : "Other";
  const device = /ipad|tablet/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua)) ? "tablet" : /mobi|iphone|android/i.test(ua) ? "mobile" : width && width < 768 ? "mobile" : "desktop";
  return { device, os };
}

async function visitorKey(): Promise<{ visitor: string; ua: string } | null> {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return null;
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: STATS_TZ }).format(new Date());
  const visitor = createHash("sha256").update(`${process.env.AUTH_SECRET ?? "dev-secret"}:visit:${day}:${ip}:${ua}`).digest("hex").slice(0, 32);
  return { visitor, ua };
}

/** Records a page view. A new visit starts after 30 idle minutes, or when a new campaign or outside site brings them back. */
export async function recordHit(hit: Hit): Promise<void> {
  const key = await visitorKey();
  if (!key) return;
  const h = await headers();
  const host = (h.get("host") ?? "").toLowerCase().split(":")[0];
  const path = hit.path.split("?")[0].slice(0, 200) || "/";
  const attr = attribute(hit, host);

  const current = await one<{ id: number; source: string; campaign: string | null }>(
    `select id, source, campaign from visits where visitor = $1 and last_at > now() - interval '${VISIT_GAP_MIN} minutes' order by last_at desc limit 1`,
    [key.visitor],
  );
  let visitId = current?.id;
  const newSource = attr && current && (attr.source !== current.source || (attr.campaign ?? null) !== current.campaign);
  if (current && !newSource) {
    await query(`update visits set pageviews = pageviews + 1, last_at = now() where id = $1`, [current.id]);
  } else {
    const city = h.get("x-vercel-ip-city");
    const { device, os } = deviceOf(key.ua, hit.width);
    const row = await one<{ id: number }>(
      `insert into visits (visitor, source, medium, campaign, content, referrer_host, landing_path, country, region, city, device, os)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
      [key.visitor, attr?.source ?? "direct", attr?.medium ?? "none", attr?.campaign ?? null, attr?.content ?? null, attr?.referrerHost ?? null, path,
        h.get("x-vercel-ip-country"), h.get("x-vercel-ip-country-region"), city ? decodeURIComponent(city) : null, device, os],
    );
    visitId = row!.id;
  }
  await query(`insert into page_views (visit_id, path) values ($1, $2)`, [visitId, path]);
  // Keep about 13 months of history.
  if (Math.random() < 0.002) {
    await query(`delete from page_views where created_at < now() - interval '400 days'`);
    await query(`delete from visits where started_at < now() - interval '400 days'`);
  }
}

/** Credits a conversion to the visitor's latest visit today that came from somewhere (falling back to a direct visit).
 *  Each kind counts once per visitor per day, so starting several trial quizzes is still one trial. Never throws: analytics must not break sign-up or checkout. */
export async function recordConversion(kind: ConversionKind): Promise<void> {
  try {
    const key = await visitorKey();
    if (!key) return;
    if (await one(`select 1 from conversions where visitor = $1 and kind = $2`, [key.visitor, kind])) return;
    const visit = await one<{ id: number }>(`select id from visits where visitor = $1 order by (source <> 'direct') desc, last_at desc limit 1`, [key.visitor]);
    await query(`insert into conversions (visit_id, visitor, kind) values ($1, $2, $3)`, [visit?.id ?? null, key.visitor, kind]);
  } catch (err) {
    console.error("[traffic] conversion not recorded", err);
  }
}
