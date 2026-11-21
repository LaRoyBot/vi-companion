import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://vi-companion.vercel.app";
  return ["/", "/support", "/privacy", "/terms"].map((path) => ({
    url: new URL(path, base).toString(),
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.4,
  }));
}
