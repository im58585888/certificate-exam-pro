import Link from "next/link";
import { SITE_URL } from "@/lib/seo";

export type Crumb = { name: string; href: string };

/** Visible breadcrumb trail. Pair with breadcrumbLd() in the page's structured data. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {i < items.length - 1 ? <Link href={c.href} className="hover:text-ink hover:underline">{c.name}</Link> : <span aria-current="page" className="text-soft">{c.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export const breadcrumbLd = (items: Crumb[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE_URL}${c.href === "/" ? "" : c.href}` })),
});
