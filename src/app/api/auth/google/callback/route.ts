import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOutEverywhere } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { exchangeCode, GOOGLE_STATE_COOKIE, googleConfigured } from "@/lib/google";
import { appOrigin } from "@/lib/request";
import { recordConversion } from "@/lib/traffic";

// Completes Google sign-in: validates state, exchanges the code, then finds, links or creates the account.
export async function GET(req: Request) {
  if (!googleConfigured) return new Response("Google sign-in is not configured", { status: 404 });
  const url = new URL(req.url);
  const jar = await cookies();
  const saved = jar.get(GOOGLE_STATE_COOKIE)?.value;
  jar.delete(GOOGLE_STATE_COOKIE);
  let stored: { state: string; verifier: string; next: string } | null = null;
  try { stored = saved ? JSON.parse(saved) : null; } catch { stored = null; }
  const code = url.searchParams.get("code");
  if (!stored || !code || url.searchParams.get("state") !== stored.state) redirect("/login?error=google");

  let profile;
  try {
    profile = await exchangeCode(code, stored.verifier, `${await appOrigin()}/api/auth/google/callback`);
  } catch (err) {
    console.error("Google sign-in failed:", err);
    redirect("/login?error=google");
  }
  if (!profile.email || !profile.emailVerified) redirect("/login?error=google-email");

  let user = await one<{ id: string }>(`select id from users where google_sub = $1`, [profile.sub]);
  if (!user) {
    // Link to an existing account with the same (Google-verified) email, or create a new one.
    // If that account's email was never proven, someone else may have registered it first: drop its password and sessions.
    const linked = await one<{ id: string; was_verified: boolean }>(
      `update users u set google_sub = $1, email_verified = true, name = coalesce(u.name, $3),
         password_hash = case when old.email_verified then u.password_hash end
       from users old where old.id = u.id and u.email = $2
       returning u.id, old.email_verified as was_verified`,
      [profile.sub, profile.email.toLowerCase(), profile.name],
    );
    if (linked && !linked.was_verified) await signOutEverywhere(linked.id);
    user = linked;
  }
  if (!user) {
    user = await one<{ id: string }>(
      `insert into users (email, name, google_sub, email_verified) values ($1, $2, $3, true) returning id`,
      [profile.email.toLowerCase(), profile.name, profile.sub],
    );
    await recordConversion("signup", profile.email);
  }
  await query(`update users set email_verified = true where id = $1`, [user!.id]);
  await signIn(user!.id);
  redirect(stored.next);
}
