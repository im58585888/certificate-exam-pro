import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, breadcrumbLd } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { EXAM_LIST } from "@/lib/exams";
import { ARTICLES } from "@/lib/library";
import { graph } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "AWS Certification Guides: Roadmap, Costs, Readiness · Certificate Exam Pro" },
  description: "Plain-English guides to AWS certification: which exam to take first, exam cost and passing scores, how to know you're ready, and which AWS services changed in 2026.",
  alternates: { canonical: "/guides" },
};

const crumbs = [{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }];

export default function Guides() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={graph(breadcrumbLd(crumbs))} />
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">AWS certification guides</h1>
      <div className="mt-8 grid gap-3">
        {ARTICLES.map((a) => (
          <Link key={a.slug} href={`/guides/${a.slug}`} className="card p-5 hover:border-brand">
            <span className="block text-lg font-extrabold">{a.title}</span>
            <span className="mt-1 block text-soft">{a.answer}</span>
          </Link>
        ))}
      </div>
      <h2 className="mt-12 text-xl font-extrabold">Exam study guides</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {EXAM_LIST.map((e) => (
          <Link key={e.slug} href={`/exams/${e.slug}`} className="card p-4 hover:border-brand">
            <span className="text-xs font-bold text-muted">{e.code}</span>
            <span className="block font-extrabold">{e.shortName}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
