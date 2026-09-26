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
        <nav className="flex gap-4 font-semibold">
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
