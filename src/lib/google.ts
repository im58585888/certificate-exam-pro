import "server-only";

export const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const GOOGLE_STATE_COOKIE = "cep_oauth";

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

/**
 * Exchanges an authorization code for tokens and reads the ID token's claims.
 * The ID token comes straight from Google's token endpoint over TLS, which OpenID Connect
 * accepts in place of signature verification; issuer, audience and expiry are still checked.
 */
export async function exchangeCode(code: string, verifier: string, redirectUri: string): Promise<GoogleProfile> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("Google response had no ID token");
  const claims = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString("utf8"));
  if (!["https://accounts.google.com", "accounts.google.com"].includes(claims.iss)) throw new Error("Unexpected token issuer");
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("Token audience mismatch");
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) throw new Error("Token expired");
  return {
    sub: String(claims.sub),
    email: String(claims.email ?? "").toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    name: claims.name ? String(claims.name).slice(0, 80) : null,
  };
}
