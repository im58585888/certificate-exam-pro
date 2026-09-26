"use client";

import { useActionState } from "react";
import { joinWaitlistAction, type WaitlistState } from "@/app/actions";

export function WaitlistForm({ signedInEmail, source = "pricing" }: { signedInEmail?: string; source?: string }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlistAction, {});
  if (state.joined) {
    return <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm font-semibold text-ok">You&apos;re on the list. We&apos;ll email you as soon as passes are available.</p>;
  }
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="source" value={source} />
      {signedInEmail ? (
        <p className="text-sm text-soft">We&apos;ll notify <b className="text-ink">{signedInEmail}</b>.</p>
      ) : (
        <input className="input" name="email" type="email" required autoComplete="email" placeholder="you@example.com" aria-label="Email" />
      )}
      {state.error && <p className="text-sm font-semibold text-bad" role="alert">{state.error}</p>}
      <button className="btn-primary w-full !py-3" disabled={pending}>{pending ? "Adding…" : "Notify me when passes launch"}</button>
    </form>
  );
}
