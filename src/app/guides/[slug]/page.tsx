import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LibraryArticle } from "@/components/LibraryArticle";
import { ARTICLES, getPage } from "@/lib/library";
import { allStatusNotes } from "@/lib/lifecycle";
import { ensureBank } from "@/lib/questions";

export const revalidate = 3600;
export const generateStaticParams = () => ARTICLES.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const p = getPage((await params).slug);
  if (!p || p.kind !== "guide") return {};
  return { title: { absolute: p.metaTitle }, description: p.description, alternates: { canonical: `/guides/${p.slug}` }, openGraph: { title: p.metaTitle, description: p.description, type: "article", modifiedTime: p.reviewed } };
}

/** The retired-services guide shows the live lifecycle list, so it can never drift from the notes on questions. */
function LifecycleTable() {
  return (
    <section id="changes" className="mt-12 scroll-mt-20" aria-labelledby="changes-h">
      <h2 id="changes-h" className="text-2xl font-extrabold">Every change, with dates and sources</h2>
      <div className="mt-4 grid gap-3">
        {allStatusNotes().map((n) => (
          <div key={n.id} className="card p-4">
            <p className="font-extrabold">{n.service} <span className="pill ml-1 bg-warn-soft text-warn">{n.label}</span></p>
            <p className="mt-1 text-[15px] text-soft">{n.text}</p>
            {n.exam && Object.entries(n.exam).map(([slug, t]) => <p key={slug} className="mt-1 text-[15px]"><b>{slug.toUpperCase()}:</b> <span className="text-soft">{t}</span></p>)}
            <a href={n.source.url} className="mt-1 inline-block text-sm text-brand hover:underline" target="_blank" rel="noopener">Source: {n.source.title}</a>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  await ensureBank();
  const p = getPage((await params).slug);
  if (!p || p.kind !== "guide") notFound();
  return <LibraryArticle page={p}>{p.slug === "aws-retired-services-exam" && <LifecycleTable />}</LibraryArticle>;
}
