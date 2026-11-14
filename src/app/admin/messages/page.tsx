import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { CONTACT_TOPICS } from "@/lib/contact";
import { setMessageStatusAction } from "../actions";

const STATUSES = ["open", "answered", "archived"] as const;

export default async function AdminMessages({ searchParams }: PageProps<"/admin/messages">) {
  await requireAdmin();
  const { status: s } = await searchParams;
  const status = STATUSES.find((t) => t === s) ?? "open";
  const [messages, counts] = await Promise.all([
    query<{ id: number; name: string | null; email: string; topic: string; message: string; page: string | null; created_at: Date; signed_in: boolean }>(
      `select id, name, email, topic, message, page, created_at, (user_id is not null) as signed_in
       from contact_messages where status = $1 order by created_at desc limit 200`, [status]),
    query<{ status: string; n: number }>(`select status, count(*)::int as n from contact_messages group by 1`),
  ]);
  const count = (t: string) => counts.find((c) => c.status === t)?.n ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 text-sm font-semibold">
          {STATUSES.map((t) => (
            <Link key={t} href={`/admin/messages?status=${t}`} className={`pill capitalize ${t === status ? "bg-brand text-on-brand" : "bg-surface-2 text-soft"}`}>{t} · {count(t)}</Link>
          ))}
        </div>
        <Link href="/contact" className="text-sm font-semibold text-brand">View contact page →</Link>
      </div>
      {messages.length === 0 ? (
        <p className="card p-6 text-soft">No {status} messages.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => {
            const topic = CONTACT_TOPICS[m.topic as keyof typeof CONTACT_TOPICS] ?? m.topic;
            const reply = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${topic}`)}&body=${encodeURIComponent(`\n\n---\nOn ${new Date(m.created_at).toLocaleDateString("en-US")} you wrote:\n> ${m.message.replace(/\n/g, "\n> ")}`)}`;
            return (
              <li key={m.id} className="card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold">{m.name ? `${m.name} · ` : ""}<span className="text-brand">{m.email}</span>{m.signed_in && <span className="pill ml-2 bg-surface-2 text-xs text-muted">account</span>}</p>
                  <span className="text-xs text-muted">{new Date(m.created_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-soft">{topic}{m.page && <span className="font-normal text-muted"> · from {m.page}</span>}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={reply} className="btn-primary !px-3 !py-1 !text-xs">Reply by email</a>
                  {STATUSES.filter((t) => t !== status).map((t) => (
                    <form key={t} action={setMessageStatusAction}>
                      <input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value={t} />
                      <button className="btn-ghost !px-3 !py-1 !text-xs">{t === "open" ? "Reopen" : t === "answered" ? "Mark answered" : "Archive"}</button>
                    </form>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
