import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { FREE_TRIAL_QUESTIONS } from "@/lib/exams";

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

export default async function AdminOverview() {
  await requireAdmin();
  const m = (await one<Record<string, number>>(`
    select
      (select count(*)::int from users) as users,
      (select count(*)::int from users where created_at > now() - interval '7 days') as users_7d,
      (select count(*)::int from users where created_at > now() - interval '30 days') as users_30d,
      (select count(distinct coalesce(user_id::text, anon_id))::int from quiz_sessions
         where mode = 'trial' and created_at > now() - interval '30 days') as trial_starts_30d,
      (select count(*)::int from (
         select coalesce(s.user_id::text, s.anon_id) as owner from attempts a join quiz_sessions s on s.id = a.session_id
         where s.mode = 'trial' and s.created_at > now() - interval '30 days'
         group by 1 having count(distinct a.question_id) >= ${FREE_TRIAL_QUESTIONS}) t) as trial_done_30d,
      (select count(distinct user_id)::int from entitlements where source = 'stripe') as payers,
      (select count(distinct user_id)::int from entitlements where source = 'stripe' and created_at > now() - interval '30 days') as payers_30d,
      (select count(distinct user_id)::int from entitlements where starts_at <= now() and ends_at > now()) as active_passes,
      (select coalesce(sum(amount_cents), 0)::int from entitlements where source = 'stripe') as revenue,
      (select coalesce(sum(amount_cents), 0)::int from entitlements where source = 'stripe' and created_at > now() - interval '30 days') as revenue_30d,
      (select count(*)::int from attempts where created_at > now() - interval '7 days') as answers_7d,
      (select count(distinct coalesce(user_id::text, anon_id))::int from attempts where created_at > now() - interval '7 days') as learners_7d,
      (select count(*)::int from question_reports where status = 'open') as open_reports
  `))!;

  const days = await query<{ day: string; signups: number; purchases: number; revenue: number; answers: number }>(`
    with d as (select generate_series(current_date - 13, current_date, interval '1 day')::date as day)
    select to_char(d.day, 'Mon DD') as day,
      (select count(*)::int from users u where u.created_at::date = d.day) as signups,
      (select count(*)::int from entitlements e where e.source = 'stripe' and e.created_at::date = d.day) as purchases,
      (select coalesce(sum(amount_cents), 0)::int from entitlements e where e.source = 'stripe' and e.created_at::date = d.day) as revenue,
      (select count(*)::int from attempts a where a.created_at::date = d.day) as answers
    from d order by d.day desc`);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Revenue (30 days)" value={money(m.revenue_30d)} note={`${money(m.revenue)} all time`} />
        <Stat label="Paying customers" value={m.payers.toLocaleString()} note={`${m.payers_30d} in the last 30 days`} />
        <Stat label="Active passes" value={m.active_passes.toLocaleString()} note="Includes complimentary" />
        <Stat label="Sign-up → paid (30 days)" value={pct(m.payers_30d, m.users_30d)} note={`${m.users_30d} sign-ups`} />
        <Stat label="Users" value={m.users.toLocaleString()} note={`${m.users_7d} new this week`} />
        <Stat label="Trials started (30 days)" value={m.trial_starts_30d.toLocaleString()} note={`${pct(m.trial_done_30d, m.trial_starts_30d)} finished all ${FREE_TRIAL_QUESTIONS}`} />
        <Stat label="Active learners (7 days)" value={m.learners_7d.toLocaleString()} note={`${m.answers_7d.toLocaleString()} answers`} />
        <div className="card p-4">
          <p className="text-sm text-muted">Open question reports</p>
          <p className="mt-1 text-2xl font-extrabold">{m.open_reports}</p>
          <Link href="/admin/reports" className="text-xs font-bold text-brand">Review →</Link>
        </div>
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="font-extrabold">Last 14 days</h2>
        <table className="mt-3 w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs text-muted"><tr><th className="py-2">Day</th><th className="text-right">Sign-ups</th><th className="text-right">Purchases</th><th className="text-right">Revenue</th><th className="text-right">Answers</th></tr></thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day} className="border-t border-line tabular-nums">
                <td className="py-2">{d.day}</td><td className="text-right">{d.signups}</td><td className="text-right">{d.purchases}</td>
                <td className="text-right">{money(d.revenue)}</td><td className="text-right">{d.answers.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
