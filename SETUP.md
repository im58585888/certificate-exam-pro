# Connecting your accounts

Paste each value into `app/.env.local` (already created, with blank lines for each key), save, restart the dev server, then run:

```bash
npm run check:setup
```

Never paste keys into chat, email or the code itself. `.env.local` is excluded from git.

## 1. Supabase (database)

1. In Supabase, create a **new project** (e.g. `certificate-exam-pro`). Pick the Region closest to your users (US East if unsure) and save the **database password** somewhere safe.
2. Open the project → click **Connect** (top bar) → **Transaction pooler**. Copy the URI. It looks like
   `postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres`
3. Replace `[YOUR-PASSWORD]` with your database password and paste it as `DATABASE_URL=`.
   - If the password has special characters (`@ : / ? #`), reset it to letters and digits only (Project Settings → Database → Reset database password).
4. Optional, recommended: Project Settings → Database → **SSL Configuration** → Download certificate. Paste its contents into `DATABASE_CA_CERT` (keep the quotes; replace line breaks with `\n`).
5. Restart the dev server. Tables are created automatically on the first request.

The site only uses Supabase as a Postgres database. Supabase Auth and Storage aren't used. Every table has row-level security turned on, so Supabase's public Data API can't read them. For extra safety you can also turn off the Data API (Project Settings → Data API) because the site doesn't need it. Supabase's Security Advisor should show no "RLS disabled" warnings for this app's tables.

## 2. Stripe (payments), test mode first

1. In the Stripe Dashboard, switch to **Test mode** (or a Sandbox).
2. **Developers → API keys** → reveal the **Secret key** (`sk_test_…`) → paste as `STRIPE_SECRET_KEY=`.
3. Locally, the webhook is optional: the success page grants access right after checkout. Pay with the test card `4242 4242 4242 4242`, any future expiry date and any CVC.
4. For production (after deploying), go to **Developers → Webhooks → Add endpoint**:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - Copy the endpoint's **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.
5. Before accepting real money, finish **account activation** (business details and bank account), then repeat steps 2 and 4 with **live** keys in the production environment.

## 3. Google sign-in

1. Go to <https://console.cloud.google.com/> → create a project named `Certificate Exam Pro`.
2. **Google Auth Platform** (formerly "OAuth consent screen") → **Get started**: app name *Certificate Exam Pro*, support email, audience **External**, contact email → Create.
3. **Clients → Create client** → type **Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` (add `https://<your-domain>` later)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback` (add `https://<your-domain>/api/auth/google/callback` later)
4. Copy the **Client ID** and **Client secret** → `GOOGLE_CLIENT_ID=` / `GOOGLE_CLIENT_SECRET=`.
5. **Audience → Publish app**, so anyone (not just test users) can sign in. The basic scopes used here (email, profile) don't need Google's verification review.

Sign in with Google as `im58585888@gmail.com` and you'll have the **Admin** link (it's listed in `ADMIN_EMAILS`).

## 4. Email for password resets (after you have a domain)

Use a sending service with your own domain, e.g. **Resend** (free tier) or **Amazon SES**. Verify the domain (adds a few DNS records), create SMTP credentials, and set:

```
SMTP_URL=smtps://USERNAME:PASSWORD@smtp.resend.com:465
MAIL_FROM=Certificate Exam Pro <no-reply@yourdomain.com>
```

Until then, reset links are printed in the dev server log.

## 5. Going live

See "Go live checklist" in `README.md`: hosting (Vercel), domain, production environment variables (use a **new** `AUTH_SECRET`, live Stripe keys, production URLs in Google), then a real $9.99 test purchase and refund.
