import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { GOOGLE_STATE_COOKIE, googleConfigured } from "@/lib/google";
import { appOrigin } from "@/lib/request";

// Starts Google sign-in: stores state + PKCE verifier in a short-lived cookie, then redirects to Google.
export async function GET(req: Request) {
  if (!googleConfigured) return new Response("Google sign-in is not configured", { status: 404 });
  const nextParam = new URL(req.url).searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  (await cookies()).set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${await appOrigin()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
