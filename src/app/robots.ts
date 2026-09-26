import type { MetadataRoute } from "next";

const base = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/quiz", "/results", "/dashboard", "/account", "/checkout", "/reset-password"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
