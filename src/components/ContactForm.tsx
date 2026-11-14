"use client";

import { useActionState } from "react";
import { sendContactAction, type ContactState } from "@/app/actions";
import { CONTACT_TOPICS } from "@/lib/contact";

export function ContactForm({ signedInEmail, defaultTopic, from }: { signedInEmail?: string; defaultTopic?: string; from?: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactAction, {});
  if (state.sent) {
    return (
      <div className="rounded-2xl bg-ok-soft p-6 text-center">
        <p className="text-3xl">✉️</p>
        <p className="mt-2 text-lg font-extrabold text-ok">Thanks, your message is on its way.</p>
        <p className="mt-1 text-sm text-soft">I read every message and usually reply within 1–2 days.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      {from && <input type="hidden" name="from" value={from} />}
      {/* Honeypot: hidden from people, filled in by spam bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Your name <span className="font-normal text-muted">(optional)</span>
          <input className="input mt-1" name="name" autoComplete="name" maxLength={80} />
        </label>
        {signedInEmail ? (
          <div className="text-sm font-semibold">Reply to<p className="mt-1 py-2.5 font-normal text-soft">{signedInEmail}</p></div>
        ) : (
          <label className="text-sm font-semibold">Your email
            <input className="input mt-1" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </label>
        )}
      </div>
      <label className="block text-sm font-semibold">What&apos;s it about?
        <select className="input mt-1" name="topic" required defaultValue={defaultTopic && defaultTopic in CONTACT_TOPICS ? defaultTopic : ""}>
          <option value="" disabled>Choose a topic</option>
          {Object.entries(CONTACT_TOPICS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Message
        <textarea className="input mt-1 min-h-40" name="message" required minLength={10} maxLength={5000} placeholder="Ask anything: a question that confused you, a problem with your account, an idea…" />
      </label>
      {state.error && <p className="text-sm font-semibold text-bad" role="alert">{state.error}</p>}
      <button className="btn-primary w-full !py-3" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
