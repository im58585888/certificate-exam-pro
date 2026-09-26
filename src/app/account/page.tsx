import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { query } from "@/lib/db";

export const metadata: Metadata = { title: "Account" };

const fmt = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  const access = await getAccess(user.id);
  const passes = await query<{ starts_at: Date; ends_at: Date; amount_cents: number | null; source: string }>(
    `select starts_at, ends_at, amount_cents, source from entitlements where user_id = $1 order by starts_at desc`, [user.id]);
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
        {access.active ? (
          <p className="mt-1 text-lg font-bold text-ok">All-access pass active until {fmt(access.endsAt!)}</p>
        ) : (
          <p className="mt-1 text-lg font-bold">Free plan {access.endsAt && <span className="font-normal text-muted">(last pass ended {fmt(access.endsAt)})</span>}</p>
        )}
        <Link className="btn-primary mt-4" href="/pricing">{access.active ? "Add more time" : "Get a pass"}</Link>
        {passes.length > 0 && (
          <table className="mt-6 w-full text-left text-sm">
            <thead className="text-muted"><tr><th className="py-2">Period</th><th>Amount</th></tr></thead>
            <tbody>
              {passes.map((p, i) => (
                <tr key={i} className="border-t border-line"><td className="py-2">{fmt(p.starts_at)} – {fmt(p.ends_at)}</td><td>{p.source === "dev" ? "Test" : p.source === "comp" ? "Complimentary" : `$${((p.amount_cents ?? 0) / 100).toFixed(2)}`}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
