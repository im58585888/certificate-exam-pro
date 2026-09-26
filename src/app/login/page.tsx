import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getUser } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const initialError = error === "google" ? "Google sign-in didn't complete. Please try again." : error === "google-email" ? "Your Google account email isn't verified." : undefined;
  if (await getUser()) redirect(typeof next === "string" && next.startsWith("/") ? next : "/dashboard");
  return (
    <div className="px-4 py-14">
      <h1 className="text-center text-3xl font-extrabold">Welcome back</h1>
      <p className="mt-1 text-center text-soft">Pick up where you left off.</p>
      <AuthForm kind="login" next={typeof next === "string" ? next : undefined} google={googleConfigured} initialError={initialError} />
    </div>
  );
}
