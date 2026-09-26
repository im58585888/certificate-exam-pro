// Checks every external integration using the values in .env.local (or the real environment).
// Run: npm run check:setup   — secrets are never printed.
import pg from "pg";
import Stripe from "stripe";
import nodemailer from "nodemailer";

const env = process.env;
const results = [];
const ok = (name, detail) => results.push(["✓", name, detail]);
const bad = (name, detail) => results.push(["✗", name, detail]);
const skip = (name, detail) => results.push(["–", name, detail]);

// App basics
if (!env.APP_URL) bad("APP_URL", "not set (use http://localhost:3000 locally, your https domain in production)");
else ok("APP_URL", env.APP_URL);
if (!env.AUTH_SECRET) bad("AUTH_SECRET", "not set: generate one with  openssl rand -hex 32");
else if (env.AUTH_SECRET.length < 32) bad("AUTH_SECRET", "too short: use at least 32 characters");
else ok("AUTH_SECRET", "set");
if (!env.ADMIN_EMAILS) bad("ADMIN_EMAILS", "not set: no one can open /admin");
else ok("ADMIN_EMAILS", `${env.ADMIN_EMAILS.split(",").length} admin(s)`);

// Database
if (!env.DATABASE_URL) {
  skip("Database", "DATABASE_URL not set: local dev uses the embedded database");
} else {
  const url = new URL(env.DATABASE_URL);
  url.searchParams.delete("sslmode");
  if (/^db\..*\.supabase\.co$/.test(url.hostname)) {
    bad("Database host", "this is Supabase's direct (IPv6-only) host. Use the pooler string from Connect → 'Transaction pooler' instead");
  }
  const ssl = env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true }
    : ["localhost", "127.0.0.1"].includes(url.hostname) ? undefined : { rejectUnauthorized: false };
  const client = new pg.Client({ connectionString: url.toString(), ssl, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    const { rows } = await client.query("select current_setting('server_version') as v");
    const tables = ["users", "sessions", "quiz_sessions", "attempts", "entitlements", "password_resets", "auth_throttle", "question_reports", "question_overrides"];
    const t = await client.query("select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = any($1)", [tables]);
    if (t.rows.length === 0) skip("Database tables", "not created yet: they appear after the first page load with this DATABASE_URL");
    else if (t.rows.some((r) => !r.rowsecurity)) bad("Database security", `row-level security is off for: ${t.rows.filter((r) => !r.rowsecurity).map((r) => r.tablename).join(", ")} (restart the app to apply migrations)`);
    else ok("Database security", `${t.rows.length}/${tables.length} app tables present, all protected by row-level security`);
    ok("Database", `connected to Postgres ${rows[0].v} at ${url.hostname}:${url.port || 5432}${env.DATABASE_CA_CERT ? " (certificate verified)" : " (encrypted; add DATABASE_CA_CERT to verify the certificate)"}`);
  } catch (e) {
    bad("Database", `${e.message}${/password/i.test(e.message) ? " (check the database password in the connection string)" : ""}`);
  } finally {
    await client.end().catch(() => {});
  }
}

// Stripe
if (!env.STRIPE_SECRET_KEY) {
  skip("Stripe", "STRIPE_SECRET_KEY not set: checkout is simulated locally");
} else {
  const mode = env.STRIPE_SECRET_KEY.startsWith("sk_live_") ? "LIVE" : env.STRIPE_SECRET_KEY.startsWith("sk_test_") ? "test" : null;
  if (!mode) bad("Stripe key", "should start with sk_test_ or sk_live_ (use the Secret key, not the Publishable key)");
  else {
    try {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY);
      const acct = await stripe.accounts.retrieve();
      ok("Stripe", `${mode} mode key works (account ${acct.id}${acct.charges_enabled ? ", charges enabled" : ", charges NOT enabled yet: finish account activation in Stripe"})`);
    } catch (e) {
      bad("Stripe", e.message);
    }
  }
  if (!env.STRIPE_WEBHOOK_SECRET) bad("Stripe webhook", "STRIPE_WEBHOOK_SECRET not set: payments won't be confirmed by webhook (the success page still grants access)");
  else if (!env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) bad("Stripe webhook", "should start with whsec_ (the endpoint's Signing secret)");
  else ok("Stripe webhook", "signing secret set");
}

// Email
if (!env.SMTP_URL) {
  skip("Email", "SMTP_URL not set: reset emails are printed to the console locally");
} else {
  try {
    await nodemailer.createTransport(env.SMTP_URL).verify();
    ok("Email", `SMTP login works${env.MAIL_FROM ? `; sending as ${env.MAIL_FROM}` : " (set MAIL_FROM too)"}`);
  } catch (e) {
    bad("Email", e.message);
  }
}

// Google sign-in
if (!env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_SECRET) {
  skip("Google sign-in", "not configured: the Google button stays hidden");
} else if (!env.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com") || !env.GOOGLE_CLIENT_SECRET) {
  bad("Google sign-in", "need both GOOGLE_CLIENT_ID (…apps.googleusercontent.com) and GOOGLE_CLIENT_SECRET");
} else {
  ok("Google sign-in", `configured. Authorized redirect URI must be: ${(env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/auth/google/callback`);
}

const w = Math.max(...results.map((r) => r[1].length));
console.log("\nCertificate Exam Pro — setup check\n");
for (const [s, n, d] of results) console.log(`  ${s}  ${n.padEnd(w)}  ${d}`);
const failed = results.filter((r) => r[0] === "✗").length;
console.log(failed ? `\n${failed} item(s) need attention.\n` : "\nAll configured items are working.\n");
process.exit(failed ? 1 : 0);
