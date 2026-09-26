"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction, type ForgotState, type FormState } from "@/app/actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(forgotPasswordAction, {});
  if (state.sent) {
    return (
      <div className="card mx-auto mt-6 max-w-md space-y-3 p-7 text-center">
        <h2 className="text-lg font-extrabold">Check your email</h2>
        <p className="text-soft">If an account exists for that address, we&apos;ve sent a link to reset your password. It expires in 1 hour.</p>
        {state.devLink && (
          <p className="rounded-xl bg-warn-soft px-3 py-2 text-left text-xs text-warn">
            Development mode (no email service configured): <a className="font-bold underline" href={state.devLink}>open reset link</a>
          </p>
        )}
        <Link href="/login" className="btn-ghost">Back to log in</Link>
      </div>
    );
  }
  return (
    <form action={action} className="card mx-auto mt-6 max-w-md space-y-4 p-7">
      <label className="block">
        <span className="text-sm font-semibold">Email</span>
        <input className="input mt-1" name="email" type="email" autoComplete="email" required />
      </label>
      {state.error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad" role="alert">{state.error}</p>}
      <button className="btn-primary w-full !py-3" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="card mx-auto mt-6 max-w-md space-y-4 p-7">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="text-sm font-semibold">New password</span>
        <input className="input mt-1" name="password" type="password" minLength={8} required autoComplete="new-password" />
        <span className="mt-1 block text-xs text-muted">At least 8 characters. You&apos;ll be signed out on other devices.</span>
      </label>
      {state.error && (
        <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad" role="alert">
          {state.error} <Link href="/forgot-password" className="underline">Request a new link</Link>
        </p>
      )}
      <button className="btn-primary w-full !py-3" disabled={pending}>{pending ? "Saving…" : "Set new password"}</button>
    </form>
  );
}
