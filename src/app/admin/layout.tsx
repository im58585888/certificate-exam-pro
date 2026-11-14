import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const TABS = [
  ["/admin", "Overview"],
  ["/admin/traffic", "Traffic"],
  ["/admin/questions", "Questions"],
  ["/admin/reports", "Reports"],
  ["/admin/messages", "Messages"],
  ["/admin/users", "Users"],
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Admin</h1>
        <nav className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1 text-sm font-semibold">
          {TABS.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-soft hover:bg-surface-2 hover:text-ink">{label}</Link>
          ))}
        </nav>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
