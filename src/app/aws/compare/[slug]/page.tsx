import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LibraryArticle } from "@/components/LibraryArticle";
import { COMPARISONS, getPage } from "@/lib/library";
import { ensureBank } from "@/lib/questions";

export const revalidate = 3600;
export const generateStaticParams = () => COMPARISONS.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/aws/compare/[slug]">): Promise<Metadata> {
  const p = getPage((await params).slug);
  if (!p || p.kind !== "compare") return {};
  return { title: { absolute: p.metaTitle }, description: p.description, alternates: { canonical: `/aws/compare/${p.slug}` }, openGraph: { title: p.metaTitle, description: p.description, type: "article", modifiedTime: p.reviewed } };
}

export default async function ComparePage({ params }: PageProps<"/aws/compare/[slug]">) {
  await ensureBank();
  const p = getPage((await params).slug);
  if (!p || p.kind !== "compare") notFound();
  return <LibraryArticle page={p} />;
}
