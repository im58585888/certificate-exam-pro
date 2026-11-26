import type { MetadataRoute } from "next";
import { CHANGELOG } from "@/lib/changelog";
import { EXAMS } from "@/lib/exams";
import { ARTICLES, COMPARISONS, LIBRARY_REVIEWED, SERVICES } from "@/lib/library";

const base = process.env.APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/pricing", "/features", "/about", "/compare/tutorials-dojo-alternative", "/contact", "/terms", "/privacy"];
  const slugs = Object.keys(EXAMS);
  const at = (d: string) => new Date(`${d}T12:00:00Z`);
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...slugs.map((slug) => ({ url: `${base}/exams/${slug}`, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...slugs.map((slug) => ({ url: `${base}/exams/${slug}/free-questions`, lastModified: at(CHANGELOG[0].date), changeFrequency: "monthly" as const, priority: 0.9 })),
    ...slugs.map((slug) => ({ url: `${base}/practice/${slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${base}/aws`, lastModified: at(LIBRARY_REVIEWED), changeFrequency: "weekly" as const, priority: 0.8 },
    ...SERVICES.map((p) => ({ url: `${base}/aws/${p.slug}`, lastModified: at(p.reviewed), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...COMPARISONS.map((p) => ({ url: `${base}/aws/compare/${p.slug}`, lastModified: at(p.reviewed), changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${base}/guides`, changeFrequency: "monthly" as const, priority: 0.6 },
    ...ARTICLES.map((p) => ({ url: `${base}/guides/${p.slug}`, lastModified: at(p.reviewed), changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${base}/changelog`, lastModified: at(CHANGELOG[0].date), changeFrequency: "weekly" as const, priority: 0.5 },
  ];
}
