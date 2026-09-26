import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { ensureBank, getQuestion } from "@/lib/questions";
import { REPORT_REASONS } from "@/lib/reports";
import { setReportStatusAction } from "../actions";

export default async function AdminReports({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdmin();
  await ensureBank();
  const { status: s } = await searchParams;
  const status = s === "resolved" || s === "dismissed" ? s : "open";
  const reports = await query<{ id: number; question_id: string; reason: string; message: string | null; created_at: Date; email: string | null }>(
    `select r.id, r.question_id, r.reason, r.message, r.created_at, u.email
     from question_reports r left join users u on u.id = r.user_id where r.status = $1 order by r.created_at desc limit 200`, [status]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm font-semibold">
        {(["open", "resolved", "dismissed"] as const).map((t) => (
          <Link key={t} href={`/admin/reports?status=${t}`} className={`pill capitalize ${t === status ? "bg-brand text-on-brand" : "bg-surface-2 text-soft"}`}>{t}</Link>
        ))}
      </div>
      {reports.length === 0 ? (
        <p className="card p-6 text-soft">No {status} reports.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/admin/questions/${encodeURIComponent(r.question_id)}`} className="font-bold text-brand">{r.question_id}</Link>
                <span className="text-xs text-muted">{r.email ?? "Anonymous"} · {new Date(r.created_at).toLocaleString("en-US")}</span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-soft">{getQuestion(r.question_id)?.prompt}</p>
              <p className="mt-2 font-semibold">{REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason}</p>
              {r.message && <p className="mt-1 whitespace-pre-wrap text-sm text-soft">{r.message}</p>}
              <div className="mt-3 flex gap-2">
                {status === "open" ? (
                  <>
                    <form action={setReportStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="resolved" /><button className="btn-ghost !px-3 !py-1 !text-xs">Mark fixed</button></form>
                    <form action={setReportStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="dismissed" /><button className="btn-ghost !px-3 !py-1 !text-xs">Dismiss</button></form>
                  </>
                ) : (
                  <form action={setReportStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="open" /><button className="btn-ghost !px-3 !py-1 !text-xs">Reopen</button></form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
