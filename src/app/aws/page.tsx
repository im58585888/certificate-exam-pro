import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, breadcrumbLd } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { fmtDate } from "@/lib/changelog";
import { CATEGORY_ORDER, COMPARISONS, LIBRARY_REVIEWED, SERVICES } from "@/lib/library";
import { SITE_URL, graph } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "AWS Cheat Sheets (2026): Services & Comparisons for AWS Exams · Certificate Exam Pro" },
  description: "Free AWS cheat sheets for SAA-C03, CLF-C02 and AIF-C01: S3, EC2, VPC, IAM, RDS, DynamoDB, Lambda, CloudFront, Bedrock, SageMaker AI and service comparisons, each with a diagram, exam decision rules and practice questions.",
  alternates: { canonical: "/aws" },
};

const crumbs = [{ name: "Home", href: "/" }, { name: "AWS cheat sheets", href: "/aws" }];

export default function AwsHub() {
  const ld = graph(breadcrumbLd(crumbs), {
    "@type": "CollectionPage", name: "AWS cheat sheets", url: `${SITE_URL}/aws`, dateModified: LIBRARY_REVIEWED,
    hasPart: [...SERVICES, ...COMPARISONS].map((p) => ({ "@type": "Article", headline: p.title, url: `${SITE_URL}/aws/${p.kind === "compare" ? "compare/" : ""}${p.slug}` })),
  });
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">AWS cheat sheets</h1>
      <p className="mt-4 max-w-3xl text-[17px] leading-relaxed">
        Short, visual summaries of the AWS services that come up most on the Cloud Practitioner, AI Practitioner and Solutions Architect – Associate exams.
        Each one starts with a direct answer, shows how the pieces connect in a diagram, lists the exam&apos;s decision rules, and ends with practice questions you can check.
      </p>
      <p className="mt-2 text-sm text-muted">Every page is checked against the official AWS documentation it links to. Last reviewed {fmtDate(LIBRARY_REVIEWED)}.</p>

      {CATEGORY_ORDER.map((cat) => {
        const sheets = SERVICES.filter((s) => s.category === cat);
        const comps = COMPARISONS.filter((c) => c.category === cat);
        if (!sheets.length && !comps.length) return null;
        return (
          <section key={cat} className="mt-10" aria-labelledby={`cat-${cat}`}>
            <h2 id={`cat-${cat}`} className="text-xl font-extrabold">{cat}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sheets.map((s) => (
                <Link key={s.slug} href={`/aws/${s.slug}`} className="card p-4 hover:border-brand">
                  <span className="text-xs font-bold text-muted">Cheat sheet</span>
                  <span className="block font-extrabold">{s.service}</span>
                  <span className="mt-1 line-clamp-2 block text-sm text-soft">{s.answer}</span>
                </Link>
              ))}
              {comps.map((c) => (
                <Link key={c.slug} href={`/aws/compare/${c.slug}`} className="card p-4 hover:border-brand">
                  <span className="text-xs font-bold text-muted">Comparison</span>
                  <span className="block font-extrabold">{c.items.join(" vs ")}</span>
                  <span className="mt-1 line-clamp-2 block text-sm text-soft">{c.answer}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="card mt-12 p-6">
        <h2 className="text-lg font-extrabold">Also useful</h2>
        <ul className="mt-2 grid gap-1 text-[15px]">
          <li><Link href="/guides" className="text-brand hover:underline">Exam guides: which exam first, cost and passing scores, how to know you&apos;re ready</Link></li>
          <li><Link href="/guides/aws-retired-services-exam" className="text-brand hover:underline">AWS services retired or renamed in 2025–2026</Link></li>
          <li><Link href="/changelog" className="text-brand hover:underline">What changed in our question bank</Link></li>
        </ul>
      </section>
    </div>
  );
}
