import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/PasswordResetForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  return (
    <div className="px-4 py-14">
      <h1 className="text-center text-3xl font-extrabold">Choose a new password</h1>
      {typeof token === "string" && token.length > 20 ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="mx-auto mt-6 max-w-md text-center text-soft">This link is incomplete. <Link className="font-bold text-brand" href="/forgot-password">Request a new reset link</Link>.</p>
      )}
    </div>
  );
}
