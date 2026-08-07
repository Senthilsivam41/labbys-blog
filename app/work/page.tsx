import type { Metadata } from "next";
import { ContentLibrary } from "@/components/content-library";
import { PageShell } from "@/components/site-shell";
import { getPublishedManifest } from "@/lib/content";
export const metadata: Metadata = { title: "Work", description: "Selected projects and practical experiments from Labs Built by Sendil." };
export default async function WorkPage() { const data = await getPublishedManifest(); return <PageShell site={data.site}><header className="page-hero section-pad"><span className="page-number">04 / Portfolio</span><span className="eyebrow">Thinking, put to work</span><h1>Work</h1><p>Selected challenges, decisions, and experiments—shared with enough context to make the lessons transferable.</p></header><section className="section-pad library"><ContentLibrary items={data.projects} emptyTitle="The workbench is being prepared." emptyCopy="Selected work will be documented here without overstating outcomes or exposing confidential details." /></section></PageShell>; }
