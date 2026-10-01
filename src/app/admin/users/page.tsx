import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { EXAM_LIST } from "@/lib/exams";
import { grantCompPassAction } from "../actions";

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "–");

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const { q: raw } = await searchParams;
  const q = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  const users = await query<{
    id: string; email: string; name: string | null; created_at: Date; last_login_at: Date | null;
    google: boolean; password: boolean; passes: { exam: string | null; ends: Date }[] | null; paid_cents: number; answers: number;
  }>(
    `select u.id, u.email, u.name, u.created_at, u.last_login_at,
       (u.google_sub is not null) as google, (u.password_hash is not null) as password,
       (select json_agg(json_build_object('exam', p.exam, 'ends', p.ends)) from
          (select exam, max(ends_at) as ends from entitlements e where e.user_id = u.id group by exam having max(ends_at) > now()) p) as passes,
       (select coalesce(sum(amount_cents), 0)::int from entitlements e where e.user_id = u.id and e.source = 'stripe') as paid_cents,
       (select count(*)::int from attempts a where a.user_id = u.id) as answers
     from users u
     where $1 = '' or u.email like '%' || $1 || '%' or lower(coalesce(u.name, '')) like '%' || $1 || '%'
     order by u.created_at desc limit 100`,
    [q],
  );
  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <input className="input max-w-sm" name="q" defaultValue={q} placeholder="Search email or name" />
        <button className="btn-primary">Search</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs text-muted"><tr><th className="p-3">User</th><th>Sign-in</th><th>Joined</th><th>Last login</th><th className="text-right">Answers</th><th className="text-right">Paid</th><th className="p-3">Access</th><th /></tr></thead>
          <tbody>
            {users.map((u) => {
              return (
                <tr key={u.id} className="border-t border-line align-middle">
                  <td className="p-3"><p className="font-semibold">{u.email}</p>{u.name && <p className="text-xs text-muted">{u.name}</p>}</td>
                  <td className="text-soft">{[u.password && "Password", u.google && "Google"].filter(Boolean).join(" + ")}</td>
                  <td className="text-soft">{fmt(u.created_at)}</td>
                  <td className="text-soft">{fmt(u.last_login_at)}</td>
                  <td className="text-right tabular-nums">{u.answers}</td>
                  <td className="text-right tabular-nums">${(u.paid_cents / 100).toFixed(2)}</td>
                  <td className="p-3">
                    {u.passes?.length ? (
                      <span className="flex flex-col gap-1">
                        {u.passes.map((p) => <span key={p.exam ?? "all"} className="pill bg-ok-soft text-ok">{p.exam ? p.exam.toUpperCase() : "All exams"} · until {fmt(p.ends)}</span>)}
                      </span>
                    ) : <span className="pill bg-surface-2 text-muted">Free</span>}
                  </td>
                  <td className="pr-3">
                    <form action={grantCompPassAction} className="flex items-center gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="exam" className="input !w-auto !py-1 text-xs" aria-label="Exam">
                        {EXAM_LIST.map((e) => <option key={e.slug} value={e.slug}>{e.code}</option>)}
                      </select>
                      <select name="days" className="input !w-auto !py-1 text-xs" aria-label="Days" defaultValue="30">
                        {[7, 30, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
                      </select>
                      <button className="btn-ghost !px-2 !py-1 !text-xs">Grant</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Granted passes are free (complimentary), cover one exam, stack on any remaining time for that exam, and aren&apos;t counted as revenue.</p>
    </div>
  );
}
