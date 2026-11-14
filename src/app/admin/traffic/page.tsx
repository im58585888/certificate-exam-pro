import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { appOrigin } from "@/lib/request";
import { STATS_TZ } from "@/lib/traffic";
import { LinkBuilder } from "./LinkBuilder";

const RANGES = [1, 7, 30, 90] as const;

interface Row { label: string; sub?: string | null; visits: number; visitors: number; bounces: number; trials: number; signups: number; waitlist: number; checkouts: number }

// Ranges are whole calendar days in STATS_TZ ("7 days" = today and the 6 days before), so the totals, the tables and the
// daily chart all cover exactly the same visits. $1 = days, $2 = time zone.
const SINCE = `(date_trunc('day', now() at time zone $2) - ($1::int - 1) * interval '1 day') at time zone $2`;

// A conversion counts once per visit, so a visit that starts three trial quizzes is one trial and "visit → trial" stays ≤ 100%.
const CONVERTED = (kind: string) => `count(distinct c.visit_id) filter (where c.kind = '${kind}')::int`;

// Every breakdown is the same query grouped by a different (whitelisted) column of the visit.
const GROUPS = {
  source: ["v.source", "v.medium"],
  campaign: ["v.campaign", "v.source || ' / ' || coalesce(v.content, '–')"],
  country: ["coalesce(v.country, '??')", "null"],
  city: ["coalesce(v.city, 'Unknown')", "coalesce(v.country, '??')"],
  landing: ["v.landing_path", "null"],
  referrer: ["v.referrer_host", "null"],
  device: ["v.device", "v.os"],
} as const;

async function breakdown(group: keyof typeof GROUPS, days: number, where = "true", limit = 15): Promise<Row[]> {
  const [label, sub] = GROUPS[group];
  return query<Row>(
    `select ${label} as label, ${sub} as sub,
       count(distinct v.id)::int as visits, count(distinct v.visitor)::int as visitors,
       count(distinct v.id) filter (where v.pageviews = 1)::int as bounces,
       ${CONVERTED("trial")} as trials, ${CONVERTED("signup")} as signups,
       ${CONVERTED("waitlist")} as waitlist, ${CONVERTED("checkout")} as checkouts
     from visits v left join conversions c on c.visit_id = v.id
     where v.started_at >= ${SINCE} and ${where}
     group by 1, 2 order by visits desc, trials desc limit ${limit}`,
    [days, STATS_TZ],
  );
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐");
const countryName = (cc: string) => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) ?? cc; } catch { return cc; } };
const SOURCE_ICON: Record<string, string> = { facebook: "📘", instagram: "📸", threads: "🧵", reddit: "👽", google: "🔎", direct: "↩️", x: "✖️", linkedin: "💼", youtube: "▶️" };

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

function Table({ title, hint, rows, first, render, compact }: { title: string; hint?: string; rows: Row[]; first: string; render?: (r: Row) => React.ReactNode; compact?: boolean }) {
  return (
    <section className="card overflow-x-auto p-5">
      <h2 className="font-extrabold">{title}</h2>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {rows.length === 0 ? <p className="mt-3 text-sm text-muted">No visits in this period yet.</p> : (
        <table className="mt-3 w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-2">{first}</th><th className="text-right">Visits</th>{!compact && <th className="text-right">Bounce</th>}
              <th className="text-right">Trials</th>{!compact && <th className="text-right">Sign-ups</th>}{!compact && <th className="text-right">Waitlist</th>}
              <th className="text-right" title="Visits that started a free trial">Visit → trial</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.label}|${r.sub}`} className="border-t border-line tabular-nums">
                <td className="py-2 pr-3">{render ? render(r) : <>{r.label ?? "–"}{r.sub && <span className="ml-2 text-xs text-muted">{r.sub}</span>}</>}</td>
                <td className="text-right">{r.visits.toLocaleString()}</td>
                {!compact && <td className="text-right">{pct(r.bounces, r.visits)}</td>}
                <td className="text-right">{r.trials}</td>
                {!compact && <td className="text-right">{r.signups}</td>}
                {!compact && <td className="text-right">{r.waitlist}</td>}
                <td className="text-right font-semibold">{pct(r.trials, r.visits)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function TrafficPage({ searchParams }: PageProps<"/admin/traffic">) {
  await requireAdmin();
  const asked = Number((await searchParams).days);
  const days = (RANGES as readonly number[]).includes(asked) ? asked : 30;

  const t = (await one<Record<string, number>>(
    `select count(*)::int as visits, coalesce(sum(v.pageviews), 0)::int as pageviews,
       count(*) filter (where v.pageviews = 1)::int as bounces,
       (select count(*)::int from (select distinct visitor, (started_at at time zone $2)::date from visits where started_at >= ${SINCE}) x) as visitors,
       (select count(distinct visit_id)::int from conversions c join visits w on w.id = c.visit_id where c.kind = 'trial' and w.started_at >= ${SINCE}) as trials,
       (select count(distinct visit_id)::int from conversions c join visits w on w.id = c.visit_id where c.kind = 'signup' and w.started_at >= ${SINCE}) as signups,
       (select count(distinct visit_id)::int from conversions c join visits w on w.id = c.visit_id where c.kind = 'waitlist' and w.started_at >= ${SINCE}) as waitlist,
       (select count(distinct visitor)::int from conversions c where c.visit_id is null and c.created_at >= ${SINCE}) as untracked
     from visits v where v.started_at >= ${SINCE}`,
    [days, STATS_TZ],
  ))!;

  // One bar per calendar day of the range (at least a week, so "Today" still shows recent days).
  const chartDays = Math.max(days, 7);
  const daily = await query<{ day: string; visitors: number; visits: number; trials: number }>(
    `with d as (select ((now() at time zone $2)::date - g)::date as day from generate_series(0, $1::int - 1) g),
     v as (select (started_at at time zone $2)::date as day, visitor, id from visits where started_at >= ${SINCE})
     select to_char(d.day, 'Mon DD') as day,
       (select count(distinct visitor)::int from v where v.day = d.day) as visitors,
       (select count(*)::int from v where v.day = d.day) as visits,
       (select count(distinct c.visit_id)::int from conversions c join v on v.id = c.visit_id where c.kind = 'trial' and v.day = d.day) as trials
     from d order by d.day`,
    [chartDays, STATS_TZ],
  );
  const peak = Math.max(1, ...daily.map((d) => d.visitors));
  const labelEvery = chartDays <= 7 ? 1 : chartDays <= 30 ? 5 : 14;
  const tzLabel = new Intl.DateTimeFormat("en-US", { timeZone: STATS_TZ, timeZoneName: "short" }).formatToParts().find((p) => p.type === "timeZoneName")?.value ?? STATS_TZ;

  const [sources, campaigns, countries, cities, landing, referrers, devices] = await Promise.all([
    breakdown("source", days),
    breakdown("campaign", days, "v.campaign is not null"),
    breakdown("country", days),
    breakdown("city", days, "v.city is not null", 10),
    breakdown("landing", days, "true", 10),
    breakdown("referrer", days, "v.referrer_host is not null", 10),
    breakdown("device", days, "true", 10),
  ]);
  const pages = await query<{ path: string; views: number }>(
    `select p.path, count(*)::int as views from page_views p join visits v on v.id = p.visit_id where v.started_at >= ${SINCE} group by 1 order by 2 desc limit 10`,
    [days, STATS_TZ],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-soft">Where visitors come from and which ads and posts turn into free trials. Your own visits as admin aren&apos;t counted.</p>
        <nav className="flex gap-1 rounded-xl border border-line bg-surface p-1 text-sm font-semibold">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin/traffic?days=${r}`} className={`rounded-lg px-3 py-1.5 ${r === days ? "bg-brand text-on-brand" : "text-soft hover:bg-surface-2"}`}>
              {r === 1 ? "Today" : `${r} days`}
            </Link>
          ))}
        </nav>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Visitors" value={t.visitors.toLocaleString()} note={days === 1 ? "Unique people today" : "Unique people per day, added up"} />
        <Stat label="Visits" value={t.visits.toLocaleString()} note={`${(t.visits ? t.pageviews / t.visits : 0).toFixed(1)} pages per visit`} />
        <Stat label="Bounce rate" value={pct(t.bounces, t.visits)} note="Visits that saw only one page" />
        <Stat label="Page views" value={t.pageviews.toLocaleString()} />
        <Stat label="Free trials started" value={t.trials.toLocaleString()} note={`${pct(t.trials, t.visits)} of visits`} />
        <Stat label="Sign-ups" value={t.signups.toLocaleString()} note={`${pct(t.signups, t.visits)} of visits`} />
        <Stat label="Waitlist joins" value={t.waitlist.toLocaleString()} note={t.untracked ? `+${t.untracked} from people who block tracking` : undefined} />
        <Stat label="Top source" value={sources[0] ? `${SOURCE_ICON[sources[0].label] ?? "🔗"} ${sources[0].label}` : "–"} note={sources[0] ? `${sources[0].visits} visits` : undefined} />
      </section>

      <section className="card p-5">
        <h2 className="font-extrabold">Visitors per day</h2>
        <p className="text-xs text-muted">Last {chartDays} days, {tzLabel}. Number above a bar = visitors; green = free trials started that day.</p>
        <div className="mt-4 flex h-44 items-end gap-1" role="img" aria-label="Visitors per day">
          {daily.map((d) => (
            <div key={d.day} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.day}: ${d.visitors} visitors, ${d.visits} visits, ${d.trials} trials`}>
              {d.trials > 0 && <span className="text-center text-[10px] font-bold text-ok">{d.trials}</span>}
              {d.visitors > 0 && chartDays <= 31 && <span className="text-center text-[10px] font-semibold tabular-nums text-soft">{d.visitors}</span>}
              <div className={`rounded-t-[4px] ${d.visitors ? "bg-brand/80 group-hover:bg-brand" : "bg-line"}`} style={{ height: `${d.visitors ? Math.max(3, (d.visitors / peak) * 85) : 1}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1 text-[10px] text-muted">
          {daily.map((d, i) => (
            <span key={d.day} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">{i % labelEvery === (daily.length - 1) % labelEvery ? d.day : ""}</span>
          ))}
        </div>
      </section>

      <Table title="Sources" hint="Where each visit came from: UTM tags first, then the referring site. 'direct' = typed URL, bookmark or an app that hides the referrer." rows={sources} first="Source / medium"
        render={(r) => <><span className="mr-1">{SOURCE_ICON[r.label] ?? "🔗"}</span><b>{r.label}</b><span className="ml-2 text-xs text-muted">{r.sub}</span></>} />

      <Table title="Campaigns" hint="Only visits from links tagged with utm_campaign. Build tagged links below." rows={campaigns} first="Campaign"
        render={(r) => <><b>{r.label}</b><span className="ml-2 text-xs text-muted">{r.sub}</span></>} />

      <LinkBuilder origin={await appOrigin()} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Table title="Countries" rows={countries} first="Country" compact render={(r) => <><span className="mr-2">{flag(r.label)}</span>{r.label === "??" ? "Unknown" : countryName(r.label)}</>} />
        <Table title="Cities" rows={cities} first="City" compact render={(r) => <>{flag(r.sub ?? "")} {r.label}</>} />
        <Table title="Landing pages" hint="The first page of each visit." rows={landing} first="Page" compact />
        <Table title="Referring sites" rows={referrers} first="Site" compact />
        <Table title="Devices" rows={devices} first="Device / OS" compact />
        <section className="card overflow-x-auto p-5">
          <h2 className="font-extrabold">Most viewed pages</h2>
          {pages.length === 0 ? <p className="mt-3 text-sm text-muted">No page views yet.</p> : (
            <table className="mt-3 w-full text-left text-sm">
              <tbody>{pages.map((p) => <tr key={p.path} className="border-t border-line tabular-nums"><td className="py-2">{p.path}</td><td className="text-right">{p.views.toLocaleString()}</td></tr>)}</tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
