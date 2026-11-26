import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, breadcrumbLd } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { EXAM_LIST } from "@/lib/exams";
import { ensureBank, questionsFor } from "@/lib/questions";
import { SITE_NAME, SITE_URL, graph, organization } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "About Certificate Exam Pro: How Our AWS Practice Questions Are Made" },
  description: "Certificate Exam Pro is an independent AWS certification practice site. How the questions are written and checked, how they're kept current with AWS changes, and how the AI tutor works.",
  alternates: { canonical: "/about" },
};

export default async function About() {
  await ensureBank();
  const total = EXAM_LIST.reduce((n, e) => n + questionsFor(e.slug).length, 0);
  const crumbs = [{ name: "Home", href: "/" }, { name: "About", href: "/about" }];
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={graph(breadcrumbLd(crumbs), { ...organization, description: `${SITE_NAME} is an independent AWS certification practice site with an AI tutor.` }, { "@type": "AboutPage", url: `${SITE_URL}/about`, about: { "@id": `${SITE_URL}/#org` } })} />
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">About Certificate Exam Pro</h1>
      <p className="mt-4 text-[17px] leading-relaxed">
        Certificate Exam Pro is an independent practice site for AWS certifications: Cloud Practitioner (CLF-C02), AI Practitioner (AIF-C01) and Solutions Architect – Associate (SAA-C03).
        We believe a practice score should mean you understand AWS, not that you&apos;ve seen the question before, and everything here is built around that.
      </p>

      <h2 className="mt-10 text-2xl font-extrabold">How the questions are made</h2>
      <ul className="mt-3 grid list-disc gap-1.5 pl-5 leading-relaxed">
        <li>{total.toLocaleString()} original questions, written to the domains and weights in each official AWS exam guide. We never use leaked real exam questions.</li>
        <li>Every option has an explanation: why the right answer works and why each wrong answer fails, with links to the AWS documentation.</li>
        <li>Wrong answers are written to be plausible, and option lengths are balanced so the longest answer isn&apos;t a giveaway; an automated audit checks every exam bank.</li>
        <li>Questions are checked against AWS&apos;s service lifecycle notices. When AWS retires, renames or closes a service, the explanation says so with the date and source. All changes are on <Link href="/changelog" className="text-brand hover:underline">What changed</Link>.</li>
        <li>Anyone can report a problem under a question; we review every report within 48 hours.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-extrabold">How Mia, the AI tutor, works</h2>
      <p className="mt-3 leading-relaxed">
        Mia is an AI tutor powered by a large language model, given the question, its options and our written explanations. Before you answer she explains the question without revealing the answer;
        afterwards she answers your follow-up questions. She&apos;s always labelled as AI, and like any AI she can make mistakes, so our written explanations and the AWS documentation remain the reference.
      </p>

      <h2 className="mt-10 text-2xl font-extrabold">Independence</h2>
      <p className="mt-3 leading-relaxed">
        Certificate Exam Pro is not affiliated with, endorsed by or sponsored by Amazon Web Services. AWS and related marks are trademarks of Amazon.com, Inc. or its affiliates.
      </p>

      <h2 className="mt-10 text-2xl font-extrabold">Contact</h2>
      <p className="mt-3 leading-relaxed">Questions, feedback or a bulk order for a school or organization? <Link href="/contact" className="text-brand hover:underline">Send us a message</Link>.</p>
    </article>
  );
}
