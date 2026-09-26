import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/PasswordResetForms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="px-4 py-14">
      <h1 className="text-center text-3xl font-extrabold">Forgot your password?</h1>
      <p className="mx-auto mt-1 max-w-md text-center text-soft">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm />
    </div>
  );
}
