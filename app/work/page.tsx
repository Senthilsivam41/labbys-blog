import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/content-library";
import { PageShell } from "@/components/site-shell";
import { formatDate, getPublishedManifest } from "@/lib/content";
import { publishedWork } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "Work",
  description: "Case studies in agentic AI, hybrid retrieval, and data platforms.",
};

export default async function WorkPage() {
  const data = await getPublishedManifest();
  const studies = publishedWork();
  return (
    <PageShell site={data.site}>
      <header className="page-hero section-pad">
        <span className="page-number">04 / Portfolio</span>
        <span className="eyebrow">Thinking, put to work</span>
        <h1>Work</h1>
        <p>Selected challenges, decisions, and experiments—shared with enough context to make the lessons transferable.</p>
      </header>
      <section className="section-pad library">
        {studies.length ? (
          <div className="card-grid">
            {studies.map((study) => (
              <article key={study.slug} className="content-card">
                <Link href={`/work/${study.slug}/`} className="card-link" aria-label={`Open ${study.title}`}>
                  <div className="card-meta">
                    <span className={`status ${study.status}`}>{study.status}</span>
                    <span>{formatDate(study.updated)}</span>
                  </div>
                  <h3>{study.title}</h3>
                  <p>{study.summary}</p>
                  <span className="text-link">Open case study <span aria-hidden="true">↗</span></span>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="The workbench is being prepared." copy="Selected work will be documented here without overstating outcomes or exposing confidential details." />
        )}
      </section>
    </PageShell>
  );
}
