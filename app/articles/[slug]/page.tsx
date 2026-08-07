import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { PageShell } from "@/components/site-shell";
import { formatDate, getPublishedManifest } from "@/lib/content";

export const dynamicParams = false;
export const dynamic = "force-static";
export async function generateStaticParams() { const data = await getPublishedManifest(); const params = data.articles.map(({ slug }) => ({ slug })); return params.length ? params : [{ slug: "__placeholder__" }]; }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const data = await getPublishedManifest(); const article = data.articles.find((item) => item.slug === slug); return article ? { title: article.seoTitle ?? article.title, description: article.seoDescription ?? article.summary, openGraph: article.coverUrl ? { images: [article.coverUrl] } : undefined } : {}; }
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const data = await getPublishedManifest(); const article = data.articles.find((item) => item.slug === slug); if (!article) notFound(); return <PageShell site={data.site}><article className="article-page section-pad"><header><span className="eyebrow">{article.topic}</span><h1>{article.title}</h1><p className="article-summary">{article.summary}</p><div className="article-byline"><span className="brand-mark">S</span><p>Sendil<br /><small>{formatDate(article.publishedAt)} · {article.readingMinutes ?? Math.max(1, Math.ceil(article.body.split(/\s+/).length / 220))} min read</small></p></div></header><Markdown>{article.body}</Markdown></article></PageShell>; }
