import type { MetadataRoute } from "next";
import { EXAMS } from "@/lib/exams";

const base = process.env.APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/pricing", "/contact", "/terms", "/privacy"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...Object.keys(EXAMS).map((slug) => ({ url: `${base}/exams/${slug}`, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...Object.keys(EXAMS).map((slug) => ({ url: `${base}/practice/${slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
