import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots { const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.github.io/blog-site"; return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/"] }], sitemap: `${origin}/sitemap.xml` }; }
