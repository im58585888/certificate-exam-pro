"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { one, query } from "@/lib/db";
import { ensureAnonId, getUser, hashPassword, ownerClause, sha256, signIn, signOut, signOutEverywhere, verifyPassword, type Owner } from "@/lib/auth";
import { mailConfigured, sendMail } from "@/lib/mailer";
import { allowAttempt, appOrigin, clientIpHash, recordAttempt } from "@/lib/request";
import { getAccess, grantPass, paymentsMode, stripe } from "@/lib/billing";
import { isArea } from "@/lib/areas";
import { answeredCount, attemptsFor, selectQuestions, type Mode, type Scope } from "@/lib/engine";
import { flagPromptDue, flagsFor, keepFlag, setFlag } from "@/lib/flags";
import { FREE_TRIAL_QUESTIONS, getExam, TRIAL_NETWORK_CAP, PASS_DAYS, PASS_PRICE_CENTS, type DomainId } from "@/lib/exams";
import { ensureBank, feedbackFor, getQuestion, grade, type Feedback } from "@/lib/questions";
import { isExpired, loadOwnedSession } from "@/lib/quiz";
import { REPORT_REASONS } from "@/lib/reports";
import { recordConversion } from "@/lib/traffic";

// ---------- Auth ----------

export interface FormState {
  error?: string;
}

const safeNext = (v: FormDataEntryValue | null) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_WINDOW_SEC = 15 * 60;
const LOGIN_MAX_FAILURES = 10;

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 80) || null;
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const ipKey = `register:${await clientIpHash()}`;
  if (!(await allowAttempt(ipKey, 10, 3600))) return { error: "Too many sign-ups from this network. Please try again later." };
  if (await one(`select 1 from users where email = $1`, [email])) return { error: "An account with this email already exists. Try logging in." };
  await recordAttempt(ipKey);
  const user = await one<{ id: string }>(
    `insert into users (email, name, password_hash) values ($1, $2, $3) returning id`,
    [email, name, await hashPassword(password)],
  );
  await recordConversion("signup");
  await signIn(user!.id);
  redirect(safeNext(form.get("next")));
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  // Per-account limit stops password guessing; the looser per-network limit stops spraying many accounts
  // without locking out offices that share one IP address.
  const limits: [string, number][] = [[`login:${email}`, LOGIN_MAX_FAILURES], [`login-ip:${await clientIpHash()}`, LOGIN_MAX_FAILURES * 5]];
  for (const [k, max] of limits) {
    if (!(await allowAttempt(k, max, LOGIN_WINDOW_SEC))) {
      return { error: "Too many failed attempts. Wait 15 minutes, or reset your password." };
    }
  }
  const keys = limits.map(([k]) => k);
  const user = await one<{ id: string; password_hash: string | null; google_sub: string | null }>(
    `select id, password_hash, google_sub from users where email = $1`, [email]);
  if (user && !user.password_hash && user.google_sub) {
    return { error: "This account signs in with Google. Use \"Continue with Google\", or reset your password to add one." };
  }
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await Promise.all(keys.map(recordAttempt));
    return { error: "Email or password is incorrect." };
  }
  await signIn(user.id);
  redirect(safeNext(form.get("next")));
}

export interface ForgotState {
  sent?: boolean;
  devLink?: string;
  error?: string;
}

/** Always reports success so the form can't be used to discover which emails have accounts. */
export async function forgotPasswordAction(_: ForgotState, form: FormData): Promise<ForgotState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  const keys = [`reset:${email}`, `reset-ip:${await clientIpHash()}`];
  for (const k of keys) if (!(await allowAttempt(k, 5, 3600))) return { sent: true };
  await Promise.all(keys.map(recordAttempt));

  const user = await one<{ id: string }>(`select id from users where email = $1`, [email]);
  if (!user) return { sent: true };
  const token = randomBytes(32).toString("base64url");
  await query(
    `insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, now() + interval '1 hour')`,
    [sha256(token), user.id],
  );
  const link = `${await appOrigin()}/reset-password?token=${token}`;
  await sendMail({
    to: email,
    subject: "Reset your Certificate Exam Pro password",
    text: `We received a request to reset your password.\n\nReset it here (valid for 1 hour): ${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `<p>We received a request to reset your password.</p><p><a href="${link}">Reset your password</a> (valid for 1 hour).</p><p>If you didn't ask for this, you can ignore this email.</p>`,
  });
  // Local development without SMTP: surface the link so the flow can be tested.
  return { sent: true, devLink: !mailConfigured && process.env.NODE_ENV !== "production" ? link : undefined };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const reset = await one<{ user_id: string }>(
    `update password_resets set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now() returning user_id`,
    [sha256(token)],
  );
  if (!reset) return { error: "This reset link is invalid, expired or already used." };
  await query(`update users set password_hash = $2, email_verified = true where id = $1`, [reset.user_id, await hashPassword(password)]);
  await query(`update password_resets set used_at = coalesce(used_at, now()) where user_id = $1`, [reset.user_id]);
  await signOutEverywhere(reset.user_id);
  await signIn(reset.user_id);
  redirect("/dashboard?reset=1");
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}

// ---------- Quiz ----------

/** Free (unpaid) answers recorded from this network in the last 30 days. Blocks trial farming via new cookies or accounts. */
async function networkTrialUsage(ipHash: string, exam: string): Promise<number> {
  const rows = await query<{ n: number }>(
    `select count(*)::int as n from attempts where ip_hash = $1 and exam = $2 and created_at > now() - interval '30 days'`,
    [ipHash, exam],
  );
  return rows[0]?.n ?? 0;
}

const COUNTS: Record<Mode, number[]> = {
  trial: [FREE_TRIAL_QUESTIONS],
  practice: [10, 20, 30],
  reinforce: [10, 20],
  review: [10, 20, 50],
  flagged: [10, 20, 50],
  exam: [65],
};

export async function startQuizAction(form: FormData) {
  await ensureBank();
  const examSlug = String(form.get("exam") ?? "");
  const mode = String(form.get("mode") ?? "") as Mode;
  const exam = getExam(examSlug);
  if (!exam || !(mode in COUNTS)) redirect("/practice");
  // Scope: checked domains and study areas. All or none checked both mean "everything".
  const domains = form.getAll("domains").map(String).filter((v): v is DomainId => exam.domains.some((d) => d.id === v));
  const scope: Scope = { domains: [...new Set(domains)], areas: [...new Set(form.getAll("areas").map(String).filter((a) => isArea(examSlug, a)))] };
  const requested = Number(form.get("count")) || COUNTS[mode][0];
  let count = COUNTS[mode].includes(requested) ? requested : COUNTS[mode][0];

  const user = await getUser();
  const access = await getAccess(user?.id, examSlug);
  const owner: Owner = user ? { userId: user.id } : { anonId: await ensureAnonId() };

  if (!access.active) {
    if (mode !== "trial") redirect(user ? "/pricing" : `/register?next=${encodeURIComponent("/pricing")}`);
    const left = FREE_TRIAL_QUESTIONS - (await answeredCount(owner, examSlug));
    if (left <= 0) redirect("/pricing?reason=trial");
    if ((await networkTrialUsage(await clientIpHash(), examSlug)) >= TRIAL_NETWORK_CAP) redirect("/pricing?reason=trial");
    // Resume an unfinished trial rather than dealing a fresh set (otherwise skipping would reveal unlimited questions).
    const [clause, param] = ownerClause(owner, 2);
    const open = await one<{ id: string }>(
      `select id from quiz_sessions s where exam = $1 and mode = 'trial' and finished_at is null and ${clause.replace(/user_id|anon_id/g, "s.$&")}
       and exists (select 1 from unnest(s.question_ids) qid where not exists (select 1 from attempts a where a.session_id = s.id and a.question_id = qid))
       order by created_at desc limit 1`,
      [examSlug, param],
    );
    if (open) redirect(`/quiz/${open.id}`);
    count = Math.min(count, left);
  }

  const attempts = await attemptsFor(owner, examSlug);
  const flags = await flagsFor(owner, examSlug);
  const picked = selectQuestions({ exam: examSlug, mode: mode === "trial" && access.active ? "practice" : mode, count, scope, attempts, flags });
  if (picked.length === 0) redirect(`/practice/${examSlug}?empty=${mode}`);

  const row = await one<{ id: string }>(
    `insert into quiz_sessions (user_id, anon_id, exam, mode, question_ids, time_limit_sec) values ($1, $2, $3, $4, $5, $6) returning id`,
    [owner.userId ?? null, owner.anonId ?? null, examSlug, mode, picked.map((q) => q.id), mode === "exam" ? exam.examMinutes * 60 : null],
  );
  if (mode === "trial") await recordConversion("trial");
  redirect(`/quiz/${row!.id}`);
}

export type SubmitResult =
  | { status: "graded"; feedback: Feedback; flagPrompt?: boolean }
  | { status: "saved" }
  | { status: "paywall" }
  | { status: "error"; message: string };

export async function submitAnswerAction(sessionId: string, questionId: string, picks: string[], timeMs: number): Promise<SubmitResult> {
  await ensureBank();
  const loaded = await loadOwnedSession(sessionId);
  if (!loaded) return { status: "error", message: "Quiz not found." };
  const { session, owner } = loaded;
  const q = getQuestion(questionId);
  if (!q || !session.question_ids.includes(questionId)) return { status: "error", message: "Question not in this quiz." };
  if (session.finished_at || isExpired(session)) return { status: "error", message: "This quiz has ended." };

  const cleanPicks = [...new Set(picks.filter((k) => q.options.some((o) => o.key === k)))].sort();
  const need = q.type === "multi" ? (q.selectCount ?? 2) : 1;
  if (cleanPicks.length !== need) return { status: "error", message: `Select ${need} answer${need > 1 ? "s" : ""}.` };

  const existing = await one<{ picks: string[] }>(`select picks from attempts where session_id = $1 and question_id = $2`, [sessionId, questionId]);
  if (existing) {
    if (session.mode !== "exam") return { status: "graded", feedback: feedbackFor(q, existing.picks) };
    // Like the real test, exam answers can be changed until the exam is submitted.
    await query(`update attempts set picks = $3, correct = $4, created_at = now() where session_id = $1 and question_id = $2`, [sessionId, questionId, cleanPicks, grade(q, cleanPicks)]);
    return { status: "saved" };
  }

  const access = await getAccess(owner.userId, session.exam);
  // Only free answers carry a network fingerprint; paid usage is never tracked by IP.
  const ipHash = access.active ? null : await clientIpHash();
  if (ipHash) {
    if ((await answeredCount(owner, session.exam)) >= FREE_TRIAL_QUESTIONS) return { status: "paywall" };
    if ((await networkTrialUsage(ipHash, session.exam)) >= TRIAL_NETWORK_CAP) return { status: "paywall" };
  }

  await query(
    `insert into attempts (user_id, anon_id, session_id, exam, question_id, picks, correct, time_ms, ip_hash)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (session_id, question_id) do nothing`,
    [owner.userId ?? null, owner.anonId ?? null, sessionId, session.exam, questionId, cleanPicks, grade(q, cleanPicks), Math.max(0, Math.min(Math.round(timeMs), 3_600_000)), ipHash],
  );
  // Exam mode withholds feedback until the end, like the real test.
  if (session.mode === "exam") return { status: "saved" };
  return { status: "graded", feedback: feedbackFor(q, cleanPicks), flagPrompt: await flagPromptDue(owner, questionId) };
}

/** Flag or unflag a question as a weak spot. Works for any question in a session the visitor owns. */
export async function setFlagAction(sessionId: string, questionId: string, on: boolean): Promise<{ ok: boolean }> {
  const loaded = await loadOwnedSession(sessionId);
  if (!loaded || !loaded.session.question_ids.includes(questionId)) return { ok: false };
  await setFlag(loaded.owner, loaded.session.exam, questionId, on);
  return { ok: true };
}

/** "Still weak?" → keep: restart the correct-answer streak that triggers the prompt. */
export async function keepFlagAction(sessionId: string, questionId: string): Promise<{ ok: boolean }> {
  const loaded = await loadOwnedSession(sessionId);
  if (!loaded || !loaded.session.question_ids.includes(questionId)) return { ok: false };
  await keepFlag(loaded.owner, questionId);
  return { ok: true };
}

export async function finishQuizAction(sessionId: string) {
  const loaded = await loadOwnedSession(sessionId);
  if (!loaded) redirect("/practice");
  await query(`update quiz_sessions set finished_at = coalesce(finished_at, now()) where id = $1`, [sessionId]);
  redirect(`/results/${sessionId}`);
}

// ---------- Billing ----------

export async function checkoutAction(form: FormData) {
  const exam = getExam(String(form.get("exam") ?? ""));
  if (!exam) redirect("/pricing");
  const user = await getUser();
  if (!user) redirect(`/register?next=${encodeURIComponent("/pricing")}`);
  if (paymentsMode === "waitlist") redirect("/pricing");
  if (!stripe) {
    if (process.env.NODE_ENV === "production") throw new Error("Payments are not configured.");
    redirect(`/checkout/dev?exam=${exam.slug}`);
  }
  await recordConversion("checkout");
  const origin = await appOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id, exam: exam.slug },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: PASS_PRICE_CENTS,
        product_data: { name: `${exam.code} pass (${PASS_DAYS} days)`, description: `Unlimited ${exam.name} practice, mock exams, adaptive review and analytics.` },
      },
    }],
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
  });
  redirect(session.url!);
}

/** Local development stand-in for Stripe Checkout. Disabled in production. */
export async function devGrantAction(form: FormData) {
  if (paymentsMode !== "simulated") throw new Error("Not available.");
  const exam = getExam(String(form.get("exam") ?? ""));
  if (!exam) redirect("/pricing");
  const user = await getUser();
  if (!user) redirect("/login");
  await grantPass(user.id, exam.slug, `dev_${Date.now()}`, PASS_PRICE_CENTS, "dev");
  redirect(`/dashboard?exam=${exam.slug}&welcome=1`);
}

// ---------- Question feedback ----------


export async function reportQuestionAction(questionId: string, reason: string, message: string): Promise<{ ok: boolean; error?: string }> {
  await ensureBank();
  if (!getQuestion(questionId)) return { ok: false, error: "Unknown question." };
  if (!(reason in REPORT_REASONS)) return { ok: false, error: "Choose a reason." };
  const ipKey = `report:${await clientIpHash()}`;
  if (!(await allowAttempt(ipKey, 20, 3600))) return { ok: false, error: "Too many reports. Please try again later." };
  await recordAttempt(ipKey);
  const user = await getUser();
  const anon = user ? null : (await ensureAnonId());
  await query(
    `insert into question_reports (question_id, user_id, anon_id, reason, message) values ($1, $2, $3, $4, $5)`,
    [questionId, user?.id ?? null, anon, reason, message.trim().slice(0, 2000) || null],
  );
  return { ok: true };
}

// ---------- Waitlist (while paid passes aren't on sale) ----------

export interface WaitlistState {
  joined?: boolean;
  error?: string;
}

export async function joinWaitlistAction(_: WaitlistState, form: FormData): Promise<WaitlistState> {
  const user = await getUser();
  const email = (user?.email ?? String(form.get("email") ?? "")).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  const ipKey = `waitlist:${await clientIpHash()}`;
  if (!(await allowAttempt(ipKey, 10, 3600))) return { error: "Too many requests. Please try again later." };
  await recordAttempt(ipKey);
  await query(
    `insert into waitlist (email, user_id, source) values ($1, $2, $3)
     on conflict (email) do update set user_id = coalesce(waitlist.user_id, excluded.user_id)`,
    [email, user?.id ?? null, String(form.get("source") ?? "pricing").slice(0, 40)],
  );
  await recordConversion("waitlist");
  return { joined: true };
}
