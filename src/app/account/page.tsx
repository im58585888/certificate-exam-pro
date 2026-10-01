import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { EXAM_LIST } from "@/lib/exams";
import { query } from "@/lib/db";

export const metadata: Metadata = { title: "Account" };

const fmt = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  const access = await Promise.all(EXAM_LIST.map(async (exam) => ({ exam, access: await getAccess(user.id, exam.slug) })));
  const passes = await query<{ exam: string | null; starts_at: Date; ends_at: Date; amount_cents: number | null; source: string }>(
    `select exam, starts_at, ends_at, amount_cents, source from entitlements where user_id = $1 order by starts_at desc`, [user.id]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold">Account</h1>
      <div className="card mt-6 p-6">
        <p className="eyebrow">Signed in as</p>
        <p className="mt-1 text-lg font-bold">{user.name ?? user.email}</p>
        {user.name && <p className="text-soft">{user.email}</p>}
      </div>
      <div className="card mt-4 p-6">
        <p className="eyebrow">Access</p>
        <ul className="mt-2 divide-y divide-line">
          {access.map(({ exam, access: a }) => (
            <li key={exam.slug} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span><b>{exam.code}</b> <span className="text-soft">{exam.shortName}</span></span>
              {a.admin ? <span className="font-bold text-ok">Admin: unlocked</span>
                : a.active ? <span className="font-bold text-ok">Pass active until {fmt(a.endsAt!)}</span>
                : <span className="text-soft">Free trial{a.endsAt && <span className="text-muted"> (last pass ended {fmt(a.endsAt)})</span>}</span>}
            </li>
          ))}
        </ul>
        <Link className="btn-primary mt-4" href="/pricing">{access.some((x) => x.access.active && !x.access.admin) ? "Add time or another exam" : "Get a pass"}</Link>
        {passes.length > 0 && (
          <table className="mt-6 w-full text-left text-sm">
            <thead className="text-muted"><tr><th className="py-2">Exam</th><th>Period</th><th>Amount</th></tr></thead>
            <tbody>
              {passes.map((p, i) => (
                <tr key={i} className="border-t border-line"><td className="py-2 font-semibold">{p.exam ? p.exam.toUpperCase() : "All exams"}</td><td>{fmt(p.starts_at)} – {fmt(p.ends_at)}</td><td>{p.source === "dev" ? "Test" : p.source === "comp" ? "Complimentary" : `$${((p.amount_cents ?? 0) / 100).toFixed(2)}`}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
