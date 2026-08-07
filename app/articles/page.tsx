import type { Metadata } from "next";
import { ContentLibrary } from "@/components/content-library";
import { PageShell } from "@/components/site-shell";
import { byDate, getPublishedManifest } from "@/lib/content";

export const metadata: Metadata = { title: "Articles", description: "Practical writing on technology, business, and people." };
export default async function ArticlesPage() { const data = await getPublishedManifest(); return <PageShell site={data.site}><header className="page-hero section-pad"><span className="page-number">01 / Writing</span><span className="eyebrow">Ideas, made useful</span><h1>Articles</h1><p>Notes from the intersection of systems, decisions, and people—written to help the next move become clearer.</p></header><section className="section-pad library"><ContentLibrary items={byDate(data.articles)} emptyTitle="The first article is being shaped." emptyCopy="This library will grow into practical writing for learners, builders, leaders, and founders." /></section></PageShell>; }
