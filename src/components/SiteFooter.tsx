import Link from "next/link";
import { LogoMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <LogoMark size={24} />
          <p className="max-w-xl">
            Certificate Exam Pro is an independent study service. It is not affiliated with, endorsed by, or sponsored by Amazon Web Services.
            AWS and related marks are trademarks of Amazon.com, Inc. or its affiliates. All practice questions are original.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 font-semibold">
          <Link href="/exams/clf-c02" className="hover:text-ink">CLF-C02 guide</Link>
          <Link href="/exams/aif-c01" className="hover:text-ink">AIF-C01 guide</Link>
          <Link href="/exams/saa-c03" className="hover:text-ink">SAA-C03 guide</Link>
          <Link href="/aws" className="hover:text-ink">AWS cheat sheets</Link>
          <Link href="/guides" className="hover:text-ink">Guides</Link>
          <Link href="/features" className="hover:text-ink">Features</Link>
          <Link href="/changelog" className="hover:text-ink">What changed</Link>
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/about" className="hover:text-ink">About</Link>
          <Link href="/contact" className="hover:text-ink">Contact</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
