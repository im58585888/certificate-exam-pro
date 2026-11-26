import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LibraryArticle } from "@/components/LibraryArticle";
import { SERVICES, getPage } from "@/lib/library";
import { ensureBank } from "@/lib/questions";

export const revalidate = 3600;
export const generateStaticParams = () => SERVICES.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/aws/[slug]">): Promise<Metadata> {
  const p = getPage((await params).slug);
  if (!p || p.kind !== "service") return {};
  return { title: { absolute: p.metaTitle }, description: p.description, alternates: { canonical: `/aws/${p.slug}` }, openGraph: { title: p.metaTitle, description: p.description, type: "article", modifiedTime: p.reviewed } };
}

export default async function ServicePage({ params }: PageProps<"/aws/[slug]">) {
  await ensureBank();
  const p = getPage((await params).slug);
  if (!p || p.kind !== "service") notFound();
  return <LibraryArticle page={p} />;
}
