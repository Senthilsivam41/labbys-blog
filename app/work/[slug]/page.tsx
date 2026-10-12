import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site-shell";
import { getPublishedManifest } from "@/lib/content";
import { diagramUrl, publishedWork, workBySlug } from "@/lib/portfolio";

export const dynamicParams = false;
export const dynamic = "force-static";

export function generateStaticParams() {
  const params = publishedWork().map(({ slug }) => ({ slug }));
  return params.length ? params : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const study = workBySlug(slug);
  return study ? { title: study.title, description: study.summary } : {};
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublishedManifest();
  const study = workBySlug(slug);
  if (!study) notFound();
  const diagram = diagramUrl(study.diagram);
  const published = new Set(publishedWork().map((item) => item.slug));
  return (
    <PageShell site={data.site}>
      <article className="case-study section-pad">
        <header>
          <span className="eyebrow">Selected work</span>
          <p><span className={`status ${study.status}`}>{study.status}</span></p>
          <h1>{study.title}</h1>
          <p>{study.summary}</p>
        </header>
        {diagram ? <img className="case-diagram" src={diagram} alt={`${study.title} architecture`} /> : null}
        <div className="tag-row">{study.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
        <div className="prose" dangerouslySetInnerHTML={{ __html: study.body }} />
        {study.related && study.related.length > 0 ? (
          <section>
            <h2>Related</h2>
            <ul>
              {study.related.map((related) => (
                <li key={related}>
                  {published.has(related) ? <Link href={`/work/${related}/`}>{related}</Link> : <span>{related}</span>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {study.repo ? <a className="button" href={study.repo} target="_blank" rel="noreferrer">Visit repository ↗</a> : null}
      </article>
    </PageShell>
  );
}
