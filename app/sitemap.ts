import type { MetadataRoute } from "next";
import { getPublishedManifest } from "@/lib/content";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.github.io/blog-site";
  const data = await getPublishedManifest();
  const staticPaths = ["", "/articles/", "/talks/", "/slides/", "/work/", "/about/", "/advisory/"];
  return [
    ...staticPaths.map((path) => ({ url: `${origin}${path}`, lastModified: new Date(), changeFrequency: path ? "weekly" as const : "daily" as const, priority: path ? 0.7 : 1 })),
    ...data.articles.map((item) => ({ url: `${origin}/articles/${item.slug}/`, lastModified: item.updatedAt ?? item.publishedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...data.projects.map((item) => ({ url: `${origin}/work/${item.slug}/`, lastModified: item.updatedAt ?? item.publishedAt, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
