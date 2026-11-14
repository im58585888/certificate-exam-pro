import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { Suspense } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { Tracker } from "@/components/Tracker";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Certificate Exam Pro: AWS certification practice exams", template: "%s · Certificate Exam Pro" },
  description:
    "Realistic practice questions for AWS Certified Cloud Practitioner (CLF-C02), AI Practitioner (AIF-C01) and Solutions Architect – Associate (SAA-C03), with detailed explanations for every answer, adaptive review of your mistakes, and progress analytics.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Suspense fallback={null}><Tracker /></Suspense>
      </body>
    </html>
  );
}
