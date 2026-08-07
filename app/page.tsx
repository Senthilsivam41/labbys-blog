import Link from "next/link";
import { PageShell } from "@/components/site-shell";
import { ContentCard } from "@/components/content-card";
import { BrandLogo } from "@/components/brand-logo";
import { getPublishedManifest } from "@/lib/content";
import type { ContentRecord } from "@/lib/types";

export default async function Home() {
  const data = await getPublishedManifest();
  const featured = ([...data.articles, ...data.talks, ...data.slides, ...data.projects] as ContentRecord[]).filter((item) => item.featured).slice(0, 3);
  return (
    <PageShell site={data.site}>
      <section className="hero section-pad">
        <div className="hero-copy">
          <span className="eyebrow">A working lab for useful ideas</span>
          <h1>Make thoughtful things with the tools already in reach.</h1>
          <p className="hero-lede">{data.site.displayName} brings technology, business, and people together—sharing practical thinking for builders at every stage.</p>
          <div className="button-row"><Link className="button" href="/advisory/">Send an inquiry <span aria-hidden="true">↗</span></Link><Link className="text-link hero-link" href="/about/">Meet Sendil <span aria-hidden="true">→</span></Link></div>
        </div>
        <div className="hero-object hero-logo-object">
          <BrandLogo className="hero-brand-logo" eager />
        </div>
        <div className="hero-index"><span>01</span><p>Technology</p><span>02</span><p>Business</p><span>03</span><p>People &amp; Careers</p></div>
      </section>

      <section className="manifesto section-pad">
        <p className="manifesto-mark" aria-hidden="true">“</p>
        <blockquote>{data.site.motto}<span>.</span></blockquote>
        <p>A principle for learning, building, and finding a useful next step—even when resources are finite.</p>
      </section>

      <section className="section-pad section-block">
        <div className="section-heading"><div><span className="eyebrow">From the lab</span><h2>Ideas in motion</h2></div><p>Writing, talks, slides, and field notes created to make complex decisions feel more workable.</p></div>
        {featured.length ? <div className="card-grid">{featured.map((item) => <ContentCard key={`${item.kind}-${item.id}`} item={item} />)}</div> : <div className="coming-grid"><Link href="/articles/"><span>01 / Writing</span><h3>Articles are taking shape.</h3><p>Clear notes on technology, business, and careers will live here.</p><b>Visit the library →</b></Link><Link href="/talks/"><span>02 / Speaking</span><h3>Talks worth replaying.</h3><p>Edited presentations and practical sessions will be collected here.</p><b>Explore talks →</b></Link><Link href="/slides/"><span>03 / Slides</span><h3>Ideas you can carry.</h3><p>Downloadable presentations designed to keep useful thinking moving.</p><b>Browse slides →</b></Link></div>}
      </section>

      <section className="audience section-pad">
        <div><span className="eyebrow">Built for curious people</span><h2>Different vantage points.<br /><em>Shared momentum.</em></h2></div>
        <div className="audience-list"><p><span>01</span>Students, interns &amp; freshers</p><p><span>02</span>Technical professionals &amp; leaders</p><p><span>03</span>Business thinkers &amp; decision-makers</p><p><span>04</span>Founders, co-founders &amp; startup teams</p></div>
      </section>

      <section className="advisory-band section-pad"><div><span className="eyebrow">Need another perspective?</span><h2>Bring the knot.<br />We’ll find the thread.</h2></div><div><p>From architecture choices to early-stage product decisions, thoughtful advisory starts with understanding the real constraint.</p><Link className="button button-light" href="/advisory/">Start a conversation <span aria-hidden="true">↗</span></Link></div></section>
    </PageShell>
  );
}
