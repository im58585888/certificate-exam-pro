import { ARTICLES } from "./articles";
import { COMPARISONS } from "./compare";
import { SERVICES } from "./services";
import type { Category, LibPage } from "./types";

export type { LibPage, ServiceSheet, Comparison, Guide, Category } from "./types";
export { SERVICES, COMPARISONS, ARTICLES };

export const LIBRARY: LibPage[] = [...SERVICES, ...COMPARISONS, ...ARTICLES];
const BY_SLUG = new Map(LIBRARY.map((p) => [p.slug, p]));

export const getPage = (slug: string) => BY_SLUG.get(slug);

export function hrefOf(p: LibPage): string {
  if (p.kind === "service") return `/aws/${p.slug}`;
  if (p.kind === "compare") return `/aws/compare/${p.slug}`;
  return `/guides/${p.slug}`;
}

export const CATEGORY_ORDER: Category[] = ["Compute", "Storage", "Database", "Networking", "Security", "Integration", "AI and ML"];

/** Short label for link lists. */
export const labelOf = (p: LibPage) => (p.kind === "service" ? p.service : p.title);

/** Latest review date across the library, for the hub and sitemap. */
export const LIBRARY_REVIEWED = LIBRARY.map((p) => p.reviewed).sort().at(-1)!;
