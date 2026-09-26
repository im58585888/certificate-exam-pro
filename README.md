# Certificate Exam Pro

Practice-exam site for AWS certifications (SAA-C03 first): a 10-question free trial with no account, a $9.99 all-access pass for 30 days, detailed explanations for every option, adaptive review of mistakes, and analytics.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No setup is needed: data lives in an embedded Postgres under `.data/`, and checkout is simulated at `/checkout/dev` until Stripe keys are set.

## Question bank

- Questions live in `content/<exam>/<domain>.json`, one file per exam domain.
- `node scripts/validate-questions.mjs` checks structure, answer counts, domain balance and answer-position spread. Add `--links` to also check every reference URL.
- The engine never sends correct answers or explanations to the browser until a question has been answered.

## How the pieces fit

| Area | Where |
|---|---|
| Accounts, sessions, anonymous trial id, admin check | `src/lib/auth.ts` |
| Google sign-in (OAuth 2.0 + PKCE) | `src/lib/google.ts`, `src/app/api/auth/google/` |
| Password reset email | `src/app/actions.ts` (forgot/reset), `src/lib/mailer.ts` |
| Pass purchase, entitlement check, Stripe | `src/lib/billing.ts`, `src/app/api/stripe/webhook/route.ts` |
| Question selection, mastery, spaced review, readiness | `src/lib/engine.ts` |
| Question bank + admin edits (DB overrides) | `src/lib/questions.ts`, `src/lib/validate.ts` |
| Abuse limits (login throttle, free-trial network cap) | `src/lib/request.ts`, `src/app/actions.ts` |
| Admin console | `src/app/admin/` |
| Analytics | `src/app/dashboard/page.tsx`, `src/components/Charts.tsx` |

Free-trial limits and paid access are enforced on the server in `startQuizAction` and `submitAnswerAction`.

## Admin console

Visit `/admin` while signed in with an email listed in `ADMIN_EMAILS`. It includes:

- **Overview**: revenue, paying customers, conversion, trials, active learners, 14-day activity.
- **Questions**: accuracy, time and report counts per question, with flags for suspiciously easy or hard ones. Open a question to see how often each option is picked, edit it (validated), disable it, revert to the original, or add new questions.
- **Reports**: problems learners flagged with "Report a problem with this question".
- **Users**: search accounts and grant complimentary passes.

Edits are stored in the database (`question_overrides`) and reach learners within about 30 seconds, with no redeploy. To make an edit permanent in the repository, copy the JSON back into `content/` and redeploy.

## Go live checklist

1. **Database:** create a Postgres database (Neon or Supabase have free tiers; Amazon RDS also works) and set `DATABASE_URL`. Tables are created and migrated automatically on first connection.
2. **Secrets:** set `APP_URL` (your https domain) and `AUTH_SECRET` (`openssl rand -hex 32`).
3. **Stripe:** create an account, set `STRIPE_SECRET_KEY`, add a webhook endpoint `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`. Test with Stripe test-mode keys first.
4. **Email:** create an SMTP sender (Amazon SES, Resend, Postmark…), verify your sending domain, then set `SMTP_URL` and `MAIL_FROM`.
5. **Google sign-in (optional):** in Google Cloud Console create an OAuth client of type "Web application", add the redirect URI `https://<your-domain>/api/auth/google/callback`, and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. The button appears automatically once configured.
6. **Admins:** set `ADMIN_EMAILS` to your account email(s).
7. **Hosting:** deploy the `app/` folder to Vercel (import the repo, set the root directory to `app`, add the environment variables above) or any Node host with `npm run build && npm start`. Point your domain's DNS at it.
8. **Check:** `https://<your-domain>/api/health` should return `{"ok":true}`. Then run one real $9.99 test purchase and refund it in Stripe.
9. **Legal:** have the Terms and Privacy pages (currently drafts) reviewed before launch.

To try a production build locally without a database server: `ALLOW_EMBEDDED_DB=1 npm run build && ALLOW_EMBEDDED_DB=1 npm start`.
