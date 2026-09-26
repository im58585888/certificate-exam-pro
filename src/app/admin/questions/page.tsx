import Link from "next/link";
import { DOMAIN_LABEL } from "@/components/QuestionParts";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { ensureBank, getQuestion, overrideState, questionsFor } from "@/lib/questions";

const EXAM = "saa-c03";
const MIN_SAMPLE = 20;

type Flag = "easy" | "hard" | "reported";

export default async function AdminQuestions({ searchParams }: PageProps<"/admin/questions">) {
  await requireAdmin();
  await ensureBank(true);
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const domain = str("domain"), flag = str("flag") as Flag | "", q = str("q").toLowerCase(), status = str("status");

  const stats = new Map((await query<{ question_id: string; n: number; pct: number; secs: number }>(
    `select question_id, count(*)::int as n, avg(case when correct then 1.0 else 0.0 end)::float as pct, (avg(time_ms) / 1000)::float as secs
     from attempts where exam = $1 group by question_id`, [EXAM])).map((r) => [r.question_id, r]));
  const reports = new Map((await query<{ question_id: string; n: number }>(
    `select question_id, count(*)::int as n from question_reports where status = 'open' group by question_id`)).map((r) => [r.question_id, r.n]));
  const disabledIds = (await query<{ question_id: string }>(`select question_id from question_overrides where disabled and exam = $1`, [EXAM])).map((r) => r.question_id);

  // Active questions plus disabled ones (so they can be re-enabled).
  const all = [...questionsFor(EXAM), ...disabledIds.map(getQuestion).filter((x) => !!x)];
  const rows = all.map((question) => {
    const s = stats.get(question.id);
    const flags: Flag[] = [];
    if (s && s.n >= MIN_SAMPLE && s.pct > 0.95) flags.push("easy");
    if (s && s.n >= MIN_SAMPLE && s.pct < 0.3) flags.push("hard");
    if (reports.get(question.id)) flags.push("reported");
    return { question, s, reports: reports.get(question.id) ?? 0, flags, ...overrideState(question.id) };
  }).filter((r) =>
    (!domain || r.question.domain === domain) &&
    (!flag || r.flags.includes(flag)) &&
    (!status || (status === "edited" && r.edited) || (status === "disabled" && r.disabled)) &&
    (!q || `${r.question.id} ${r.question.topic} ${r.question.prompt} ${r.question.stem}`.toLowerCase().includes(q)),
  ).sort((a, b) => b.reports - a.reports || (b.flags.length - a.flags.length) || a.question.id.localeCompare(b.question.id));

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2">
        <label className="text-sm"><span className="eyebrow">Search</span><input className="input mt-1" name="q" defaultValue={q} placeholder="id, topic or text" /></label>
        <label className="text-sm"><span className="eyebrow">Domain</span>
          <select className="input mt-1" name="domain" defaultValue={domain}><option value="">All</option>{Object.entries(DOMAIN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="text-sm"><span className="eyebrow">Flag</span>
          <select className="input mt-1" name="flag" defaultValue={flag}><option value="">Any</option><option value="reported">Has open reports</option><option value="hard">Under 30% correct</option><option value="easy">Over 95% correct</option></select></label>
        <label className="text-sm"><span className="eyebrow">Status</span>
          <select className="input mt-1" name="status" defaultValue={status}><option value="">Any</option><option value="edited">Edited</option><option value="disabled">Disabled</option></select></label>
        <button className="btn-primary">Filter</button>
        <Link href="/admin/questions/new" className="btn-ghost ml-auto">+ New question</Link>
      </form>
      <p className="text-sm text-muted">{rows.length} questions. Flags need at least {MIN_SAMPLE} answers. Very low accuracy often means a wrong or ambiguous answer key.</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-muted"><tr><th className="p-3">Question</th><th>Domain</th><th className="text-right">Answers</th><th className="text-right">Correct</th><th className="text-right">Avg time</th><th className="text-right">Reports</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.question.id} className="border-t border-line align-top">
                <td className="max-w-md p-3">
                  <Link href={`/admin/questions/${encodeURIComponent(r.question.id)}`} className="font-bold text-brand">{r.question.id}</Link>
                  <span className="text-muted"> · {r.question.topic}</span>
                  <p className="line-clamp-2 text-soft">{r.question.prompt}</p>
                </td>
                <td className="py-3 text-soft">{DOMAIN_LABEL[r.question.domain]?.split(" ")[0]}</td>
                <td className="py-3 text-right tabular-nums">{r.s?.n ?? 0}</td>
                <td className={`py-3 text-right tabular-nums ${r.flags.includes("hard") ? "font-bold text-bad" : r.flags.includes("easy") ? "font-bold text-warn" : ""}`}>{r.s ? `${Math.round(r.s.pct * 100)}%` : "–"}</td>
                <td className="py-3 text-right tabular-nums">{r.s ? `${Math.round(r.s.secs)}s` : "–"}</td>
                <td className={`py-3 text-right tabular-nums ${r.reports ? "font-bold text-bad" : ""}`}>{r.reports || ""}</td>
                <td className="space-x-1 p-3">
                  {r.disabled && <span className="pill bg-bad-soft text-bad">Disabled</span>}
                  {r.edited && <span className="pill bg-brand-soft text-brand">Edited</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
