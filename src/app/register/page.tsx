import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getUser } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  if (await getUser()) redirect(typeof next === "string" && next.startsWith("/") ? next : "/dashboard");
  return (
    <div className="px-4 py-14">
      <h1 className="text-center text-3xl font-extrabold">Create your account</h1>
      <p className="mx-auto mt-1 max-w-md text-center text-soft">Your trial answers carry over, so your mistakes and analytics start from day one.</p>
      <AuthForm kind="register" next={typeof next === "string" ? next : undefined} google={googleConfigured} />
    </div>
  );
}
