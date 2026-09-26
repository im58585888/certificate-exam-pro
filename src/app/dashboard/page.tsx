import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { startQuizAction } from "../actions";
import { AccuracyLine, DailyColumns, DomainBars, type DayPoint } from "@/components/Charts";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { query } from "@/lib/db";
import { attemptsFor, dueCount, masteryBy, readiness, reviewQueue } from "@/lib/engine";
import { getExam } from "@/lib/exams";
import { ensureBank, questionsFor } from "@/lib/questions";

export const metadata: Metadata = { title: "Dashboard" };

const EXAM = "saa-c03";
const DAYS = 30;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  await ensureBank();
  const user = await getUser();
  if (!user) redirect("/login?next=/dashboard");
  const { welcome, reset } = await searchParams;
  const exam = getExam(EXAM)!;
  const access = await getAccess(user.id);
  const bank = questionsFor(EXAM);
  const attempts = await attemptsFor({ userId: user.id }, EXAM);

  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;
  const timed = attempts.filter((a) => a.time_ms);
  const avgSec = timed.length ? Math.round(timed.reduce((s, a) => s + a.time_ms!, 0) / timed.length / 1000) : 0;
  const seen = new Set(attempts.map((a) => a.question_id)).size;
  const ready = readiness(attempts, EXAM);
  const queue = reviewQueue(attempts);
  const due = dueCount(queue);

  // Daily series (UTC days) for the last 30 days, zero-filled.
  const today = new Date();
  const days: DayPoint[] = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (DAYS - 1 - i)));
    return { date: iso(d), answered: 0, correct: 0 };
  });
  const dayIdx = new Map(days.map((d, i) => [d.date, i]));
  for (const a of attempts) {
    const i = dayIdx.get(iso(new Date(a.created_at)));
    if (i !== undefined) { days[i].answered++; if (a.correct) days[i].correct++; }
  }
  const activeDays = new Set(attempts.map((a) => iso(new Date(a.created_at))));
  let streak = 0;
  for (let i = activeDays.has(iso(today)) ? 0 : 1; ; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    if (!activeDays.has(iso(d))) break;
    streak++;
  }

  const domainM = new Map(masteryBy(attempts, bank, "domain").map((m) => [m.key, m]));
  const domainRows = exam.domains.map((d) => ({ id: d.id, label: d.name.replace("Design ", ""), weight: d.weight, score: domainM.get(d.id)?.score ?? null, attempts: domainM.get(d.id)?.attempts ?? 0 }));
  const topics = masteryBy(attempts, bank, "topic").sort((a, b) => a.score - b.score);

  const sessions = await query<{ id: string; mode: string; created_at: Date; n: number; ok: number; total: number }>(
    `select s.id, s.mode, s.created_at, cardinality(s.question_ids) as total,
            count(a.id)::int as n, count(a.id) filter (where a.correct)::int as ok
     from quiz_sessions s left join attempts a on a.session_id = s.id
     where s.user_id = $1 and s.exam = $2 group by s.id order by s.created_at desc limit 8`,
    [user.id, EXAM],
  );
  const passRatio = (exam.passingScaled - 100) / 900;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {reset && <p className="mb-6 rounded-xl bg-ok-soft px-4 py-3 font-semibold text-ok">Your password was updated. Other devices have been signed out.</p>}
      {welcome && <p className="mb-6 rounded-xl bg-ok-soft px-4 py-3 font-semibold text-ok">Your all-access pass is active. Everything is unlocked.</p>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{exam.code} dashboard</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Hi{user.name ? `, ${user.name.split(" ")[0]}` : ""}. Here&apos;s where you stand.</h1>
        </div>
        <div className="flex gap-2">
          {due > 0 && access.active && (
            <form action={startQuizAction}>
              <input type="hidden" name="exam" value={EXAM} /><input type="hidden" name="mode" value="review" /><input type="hidden" name="count" value="20" />
              <button className="btn-ghost">Review {due} due</button>
            </form>
          )}
          <Link className="btn-primary" href={`/practice/${EXAM}`}>Practice now</Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <h2 className="text-xl font-extrabold">No answers yet</h2>
          <p className="mt-1 text-soft">Your analytics fill in as you practice. Start with a short set.</p>
          <Link className="btn-primary mt-5" href={`/practice/${EXAM}`}>Start practicing</Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_2fr]">
            <div className="card p-6">
              <p className="text-sm text-muted">Estimated readiness</p>
              <p className="mt-1 text-6xl font-extrabold tracking-tight">{ready.scaled}<span className="text-xl font-bold text-muted"> / 1000</span></p>
              <div className="relative mt-4 h-2.5 rounded-full bg-brand-soft">
                <div className="h-full rounded-full bg-chart" style={{ width: `${Math.min(100, ready.ratio * 100)}%` }} />
                <div className="absolute -top-1 h-4.5 border-l-2 border-ink" style={{ left: `${passRatio * 100}%` }} aria-hidden />
              </div>
              <p className="mt-2 text-sm font-semibold">
                {ready.scaled >= exam.passingScaled ? <span className="text-ok">✓ Above the {exam.passingScaled} passing line</span> : <span className="text-soft">{exam.passingScaled - ready.scaled} points below the {exam.passingScaled} passing line</span>}
              </p>
              <p className="mt-2 text-xs text-muted">
                {ready.confident ? "Weighted by exam domain, favouring your recent answers." : `Early estimate: answer at least 30 questions (${total} so far) for a steadier number.`} Not an official score.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Stat label="Questions answered" value={total.toLocaleString()} />
              <Stat label="Accuracy" value={`${Math.round((correct / total) * 100)}%`} />
              <Stat label="Avg time per question" value={`${avgSec}s`} note="Real exam allows ~120s" />
              <Stat label="Study streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
              <Stat label="Question bank seen" value={`${Math.round((seen / bank.length) * 100)}%`} note={`${seen} of ${bank.length}`} />
              <Stat label="Mistakes to review" value={String(queue.length)} note={`${due} due now`} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="card p-6">
              <h2 className="font-extrabold">Mastery by exam domain</h2>
              <p className="mb-5 text-sm text-muted">Recent answers count more than old ones.</p>
              <DomainBars rows={domainRows} passLine={0.72} />
            </section>
            <section className="card p-6">
              <h2 className="font-extrabold">Weakest topics</h2>
              <p className="mb-4 text-sm text-muted">&ldquo;Strengthen weak areas&rdquo; sessions pull from the top of this list.</p>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted"><tr><th className="pb-2 font-semibold">Topic</th><th className="pb-2 font-semibold">Mastery</th><th className="pb-2 text-right font-semibold">Answered</th></tr></thead>
                <tbody>
                  {topics.slice(0, 8).map((t) => (
                    <tr key={t.key} className="border-t border-line">
                      <td className="py-2 pr-2 font-semibold">{t.label}</td>
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-20 overflow-hidden rounded-full bg-brand-soft"><span className="block h-full rounded-full bg-chart" style={{ width: `${t.score * 100}%` }} /></span>
                          <span className="tabular-nums">{Math.round(t.score * 100)}%</span>
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums text-soft">{t.correct}/{t.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {access.active && (
                <Link href={`/practice/${EXAM}`} className="mt-4 inline-block text-sm font-bold text-brand">Start a targeted session →</Link>
              )}
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="card p-6">
              <h2 className="font-extrabold">Questions answered per day</h2>
              <p className="mb-4 text-sm text-muted">Last {DAYS} days</p>
              <DailyColumns days={days} />
            </section>
            <section className="card p-6">
              <h2 className="font-extrabold">Daily accuracy</h2>
              <p className="mb-4 text-sm text-muted">Days with practice, last {DAYS} days</p>
              <AccuracyLine days={days} />
            </section>
          </div>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer font-semibold text-muted">View daily activity as a table</summary>
            <table className="card mt-2 w-full max-w-md text-left">
              <thead className="text-xs text-muted"><tr><th className="p-2">Day</th><th className="p-2 text-right">Answered</th><th className="p-2 text-right">Correct</th></tr></thead>
              <tbody>{days.filter((d) => d.answered).map((d) => <tr key={d.date} className="border-t border-line"><td className="p-2">{d.date}</td><td className="p-2 text-right tabular-nums">{d.answered}</td><td className="p-2 text-right tabular-nums">{d.correct}</td></tr>)}</tbody>
            </table>
          </details>

          <section className="card mt-4 p-6">
            <h2 className="font-extrabold">Recent sessions</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs text-muted"><tr><th className="pb-2">Date</th><th className="pb-2">Type</th><th className="pb-2 text-right">Score</th><th /></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="py-2">{new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className="py-2 capitalize">{s.mode === "exam" ? "Mock exam" : s.mode === "reinforce" ? "Weak areas" : s.mode}</td>
                    <td className="py-2 text-right tabular-nums">{s.ok}/{s.mode === "exam" ? s.total : s.n}</td>
                    <td className="py-2 text-right"><Link className="font-bold text-brand" href={`/results/${s.id}`}>Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
