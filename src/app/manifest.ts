import type { MetadataRoute } from "next";

// Lets learners install the site on their phone's home screen (and desktop) and open it like an app, with the same
// account and pass as on the web.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Certificate Exam Pro",
    short_name: "Exam Pro",
    description: "AWS certification practice exams with an AI tutor.",
    start_url: "/dashboard?source=app",
    scope: "/",
    display: "standalone",
    background_color: "#f6f2ec",
    theme_color: "#6a55a8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Practice", url: "/practice" },
      { name: "Study sheet", url: "/study" },
    ],
  };
}
