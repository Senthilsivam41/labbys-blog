import type { Metadata, Viewport } from "next";
import "./globals.css";

const canonicalOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.github.io/blog-site";
const socialImage = `${canonicalOrigin.replace(/\/$/, "")}/og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(canonicalOrigin),
  title: { default: "Labs Built by Sendil", template: "%s — Labs Built by Sendil" },
  description: "Ideas, talks, experiments, and practical guidance from Sendil, a multi-faceted solution architect.",
  applicationName: "Labs Built by Sendil",
  other: { "apple-mobile-web-app-title": "LabbyS" },
  keywords: ["solution architecture", "technology", "business", "career growth", "startup advisory"],
  openGraph: {
    type: "website",
    title: "Labs Built by Sendil",
    description: "What we can achieve with what we have.",
    siteName: "Labs Built by Sendil",
    images: [{ url: socialImage, width: 1200, height: 630, alt: "Labs Built by Sendil" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Labs Built by Sendil",
    description: "What we can achieve with what we have.",
    images: [socialImage],
  },
};

export const viewport: Viewport = { colorScheme: "light", themeColor: "#f3efe5" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
