import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

const CONTACT = process.env.SUPPORT_EMAIL || "im58585888@gmail.com";
const UPDATED = "November 8, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="pt-4 text-xl font-extrabold text-ink">{title}</h2>
      {children}
    </section>
  );
}

// Describes what the code actually stores. Update it whenever data collection changes, and have it reviewed before selling at scale.
export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-soft [&_li]:ml-5 [&_li]:list-disc [&_b]:text-ink">
      <h1 className="text-3xl font-extrabold text-ink">Privacy Policy</h1>
      <p className="text-sm text-muted">Last updated {UPDATED}</p>
      <p>
        Certificate Exam Pro (awscertpass.com) is an online practice service for IT certification exams. This policy explains what
        information we collect, how we use it, who we share it with, and the choices you have. Questions:{" "}
        <a className="font-semibold text-brand" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <Section title="Information we collect">
        <ul className="space-y-2">
          <li><b>Account details.</b> Your email address, the name you give us (optional), and your password, stored only as a salted scrypt hash. We never store your password in readable form.</li>
          <li>
            <b>Google sign-in.</b> If you choose &ldquo;Continue with Google&rdquo;, we request only the basic <i>openid</i>, <i>email</i> and <i>profile</i> scopes and receive your
            email address, whether Google has verified it, your name, and your Google account ID. We do not receive your Google password and do not access your
            Gmail, contacts, Drive, calendar or any other Google data.
          </li>
          <li><b>Practice history.</b> The questions you answer, the options you pick, whether they were correct, time spent, and your practice and exam sessions.</li>
          <li><b>Free-trial visitors.</b> A random identifier in a cookie so your trial progress is saved without an account. If you later sign up, this history moves into your account.</li>
          <li><b>Network information.</b> To limit abuse (for example repeated login attempts or free-trial resets) we store a one-way keyed hash of your IP address, never the IP address itself.</li>
          <li><b>Things you send us.</b> Question reports you submit, questions you type to the AI tutor, and, if you join the waitlist, your email address.</li>
          <li><b>Payments.</b> When paid passes are available, payments are handled by Stripe. We receive a payment reference, the amount and the pass dates. We never see or store your card details.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul className="space-y-2">
          <li>To create your account and sign you in.</li>
          <li>To run the service: grade answers, schedule review of questions you missed, build your study sheet, and show your analytics and readiness score.</li>
          <li>To provide the pass you paid for.</li>
          <li>To keep the service secure and prevent abuse of the free trial and sign-in.</li>
          <li>To send account emails you ask for, such as password reset links, and to tell waitlist members when passes open.</li>
        </ul>
        <p>We do not sell your information, use it for advertising, or share it with data brokers.</p>
      </Section>

      <Section title="Google user data">
        <p>
          Information received from Google is used only to sign you in and to create or identify your account. We do not use it for advertising, do not sell it,
          do not transfer it to others except the service providers listed below that host our application, and do not use it to train AI models. Our use and
          transfer of information received from Google APIs adheres to the{" "}
          <a className="font-semibold text-brand" href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>,
          including the Limited Use requirements.
        </p>
      </Section>

      <Section title="Who we share it with">
        <p>We use a small number of service providers who process data on our behalf, only to run the service:</p>
        <ul className="space-y-2">
          <li><b>Vercel</b> hosts the website.</li>
          <li><b>Supabase</b> hosts our database (United States).</li>
          <li><b>Stripe</b> processes payments, when available.</li>
          <li><b>Anthropic</b> provides the AI tutor. When you use it, we send the practice question, its answer options and explanations, and any follow-up questions you type. We don&apos;t send your name, email address or account details, and Anthropic doesn&apos;t use this data to train its models.</li>
          <li>An email delivery provider sends account emails, when enabled.</li>
        </ul>
        <p>We may also disclose information if required by law.</p>
      </Section>

      <Section title="Cookies">
        <p>
          We use only strictly necessary cookies: one to keep you signed in, one to save free-trial progress, and a short-lived one that protects Google sign-in
          from forgery. We do not use advertising or third-party tracking cookies.
        </p>
      </Section>

      <Section title="Retention and deletion">
        <p>
          We keep your account and practice history while your account exists so your analytics and review schedule keep working. Sign-in sessions expire
          automatically. You can ask us to delete your account and all associated data at any time by emailing{" "}
          <a className="font-semibold text-brand" href={`mailto:${CONTACT}`}>{CONTACT}</a> from your account&apos;s email address. We complete deletion within 30 days,
          except for payment records we must keep for tax and accounting. If you signed in with Google, you can also remove our access at{" "}
          <a className="font-semibold text-brand" href="https://myaccount.google.com/connections">myaccount.google.com/connections</a>.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Connections to the site and to our database are encrypted. Passwords are hashed, sign-in tokens are stored only as hashes, and the database is not
          reachable through any public API.
        </p>
      </Section>

      <Section title="Children">
        <p>The service is not directed to children under 13, and we do not knowingly collect their information.</p>
      </Section>

      <Section title="Changes">
        <p>If we change this policy we will update the date above, and for significant changes we will notify account holders by email or on the site.</p>
      </Section>
    </article>
  );
}
