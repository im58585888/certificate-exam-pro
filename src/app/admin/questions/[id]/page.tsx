import Link from "next/link";
import { notFound } from "next/navigation";
import { ExplanationPanel, OptionList, QuestionMeta, QuestionText } from "@/components/QuestionParts";
import { QuestionEditor } from "@/components/QuestionEditor";
import { requireAdmin } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { ensureBank, feedbackFor, getQuestion, isBuiltIn, overrideState, toPublic } from "@/lib/questions";
import { REPORT_REASONS } from "@/lib/reports";
import { deleteAddedQuestionAction, revertQuestionAction, setQuestionDisabledAction, setReportStatusAction } from "../../actions";

export default async function AdminQuestion({ params, searchParams }: PageProps<"/admin/questions/[id]">) {
  await requireAdmin();
  await ensureBank(true);
  const { id: rawId } = await params;
  const { saved } = await searchParams;
  const id = decodeURIComponent(rawId);
  const q = getQuestion(id);
  if (!q) notFound();
  const state = overrideState(id);
  const exam = (await one<{ exam: string }>(`select exam from question_overrides where question_id = $1`, [id]))?.exam ?? "saa-c03";

  // Present options in stored order (A, B, C…) for review rather than the learner's shuffled order.
  const pub = { ...toPublic(q, "admin"), options: q.options.map((o) => ({ key: o.key, text: o.text })) };
  const stats = await one<{ n: number; pct: number | null; secs: number | null }>(
    `select count(*)::int as n, avg(case when correct then 1.0 else 0.0 end)::float as pct, (avg(time_ms) / 1000)::float as secs from attempts where question_id = $1`, [id]);
  const picks = new Map((await query<{ pick: string; n: number }>(
    `select pick, count(*)::int as n from attempts, unnest(picks) as pick where question_id = $1 group by pick`, [id])).map((r) => [r.pick, r.n]));
  const reports = await query<{ id: number; reason: string; message: string | null; status: string; created_at: Date; email: string | null }>(
    `select r.id, r.reason, r.message, r.status, r.created_at, u.email from question_reports r left join users u on u.id = r.user_id
     where r.question_id = $1 order by (r.status = 'open') desc, r.created_at desc limit 50`, [id]);
  const n = stats?.n ?? 0;

  return (
    <div className="space-y-6">
      <Link href="/admin/questions" className="text-sm font-bold text-brand">← All questions</Link>
      {saved && <p className="rounded-xl bg-ok-soft px-4 py-2 text-sm font-semibold text-ok">Question created.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-extrabold">{q.id}</h2>
        {state.disabled && <span className="pill bg-bad-soft text-bad">Disabled: not served to learners</span>}
        {state.edited && <span className="pill bg-brand-soft text-brand">Edited</span>}
        {!isBuiltIn(id) && <span className="pill bg-surface-2 text-soft">Added in admin</span>}
        <div className="ml-auto flex gap-2">
          <form action={setQuestionDisabledAction}>
            <input type="hidden" name="id" value={id} /><input type="hidden" name="exam" value={exam} />
            <input type="hidden" name="disabled" value={state.disabled ? "false" : "true"} />
            <button className={state.disabled ? "btn-primary" : "btn-ghost"}>{state.disabled ? "Re-enable" : "Disable"}</button>
          </form>
          {!isBuiltIn(id) && (
            <form action={deleteAddedQuestionAction}><input type="hidden" name="id" value={id} /><button className="btn-ghost !text-bad">Delete</button></form>
          )}
          {state.edited && isBuiltIn(id) && (
            <form action={revertQuestionAction}><input type="hidden" name="id" value={id} /><button className="btn-ghost">Revert to original</button></form>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-5">
          <QuestionMeta q={pub} />
          <QuestionText q={pub} />
          <div className="mt-4"><OptionList q={pub} picks={[]} feedback={feedbackFor(q, [])} /></div>
          <ExplanationPanel feedback={feedbackFor(q, [])} />
        </section>
        <aside className="space-y-4">
          <section className="card p-5">
            <h3 className="font-extrabold">Performance</h3>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><dt className="text-xs text-muted">Answers</dt><dd className="text-lg font-extrabold">{n}</dd></div>
              <div><dt className="text-xs text-muted">Correct</dt><dd className="text-lg font-extrabold">{stats?.pct != null ? `${Math.round(stats.pct * 100)}%` : "–"}</dd></div>
              <div><dt className="text-xs text-muted">Avg time</dt><dd className="text-lg font-extrabold">{stats?.secs != null ? `${Math.round(stats.secs)}s` : "–"}</dd></div>
            </dl>
            <h4 className="eyebrow mt-4">How often each option is picked</h4>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {q.options.map((o) => {
                  const c = picks.get(o.key) ?? 0;
                  return (
                    <tr key={o.key}>
                      <td className="w-8 py-1 font-bold">{o.key}{o.correct ? " ✓" : ""}</td>
                      <td className="py-1">
                        <span className="block h-2 overflow-hidden rounded-full bg-brand-soft">
                          <span className={`block h-full rounded-full ${o.correct ? "bg-ok" : "bg-chart"}`} style={{ width: `${n ? (c / n) * 100 : 0}%` }} />
                        </span>
                      </td>
                      <td className="w-14 py-1 text-right tabular-nums text-soft">{n ? `${Math.round((c / n) * 100)}%` : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">A wrong option picked more often than the correct one usually means the key or wording needs review.</p>
          </section>
          <section className="card p-5">
            <h3 className="font-extrabold">Reports ({reports.filter((r) => r.status === "open").length} open)</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {reports.length === 0 && <li className="text-muted">No reports.</li>}
              {reports.map((r) => (
                <li key={r.id} className="border-t border-line pt-3">
                  <p className="font-semibold">{REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason} <span className={`pill ml-1 ${r.status === "open" ? "bg-warn-soft text-warn" : "bg-surface-2 text-muted"}`}>{r.status}</span></p>
                  {r.message && <p className="mt-1 whitespace-pre-wrap text-soft">{r.message}</p>}
                  <p className="mt-1 text-xs text-muted">{r.email ?? "Anonymous"} · {new Date(r.created_at).toLocaleString("en-US")}</p>
                  {r.status === "open" && (
                    <div className="mt-2 flex gap-2">
                      {(["resolved", "dismissed"] as const).map((s) => (
                        <form key={s} action={setReportStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value={s} />
                          <button className="btn-ghost !px-3 !py-1 !text-xs capitalize">{s === "resolved" ? "Mark fixed" : "Dismiss"}</button></form>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <section className="card p-5">
        <h3 className="font-extrabold">Edit question</h3>
        <p className="mb-3 text-sm text-muted">Edits are stored in the database and override the built-in version. Use &quot;Revert to original&quot; to undo.</p>
        <QuestionEditor mode="edit" exam={exam} originalId={id} initialJson={JSON.stringify(q, null, 2)} />
      </section>
    </div>
  );
}
