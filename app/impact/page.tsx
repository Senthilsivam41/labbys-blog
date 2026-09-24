import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site-shell";
import { getPublishedManifest } from "@/lib/content";

export const metadata: Metadata = {
  title: "Selected impact",
  description:
    "Confidentiality-safe case studies in enterprise cloud architecture, digital payments, client advisory, and delivery leadership.",
};

const Verify = ({ children }: { children: React.ReactNode }) => (
  <span className="verify-claim">[VERIFY: {children}]</span>
);

export default async function ImpactPage() {
  const data = await getPublishedManifest();

  return (
    <PageShell site={data.site}>
      <article className="impact-page">
        <header className="impact-hero section-pad">
          <span className="eyebrow">Selected impact · Architecture leadership</span>
          <h1>Decisions that moved complex work forward.</h1>
          <p>
            Two concise stories from enterprise cloud and digital payments—focused on how I shape
            the problem, advise stakeholders, lead delivery, and make architecture choices usable.
          </p>
          <aside className="disclosure-note" aria-label="Confidentiality note">
            <strong>Disclosure note</strong>
            <p>
              Client-sensitive details are intentionally generalized. Bracketed notes mark claims
              that need evidence or publication approval before they become portfolio copy.
            </p>
          </aside>
        </header>

        <section className="impact-capabilities section-pad" aria-labelledby="capabilities-heading">
          <div className="impact-section-heading">
            <span className="eyebrow">How I contribute</span>
            <h2 id="capabilities-heading">From first conversation to accountable delivery.</h2>
          </div>
          <div className="capability-grid">
            <article><span>01</span><h3>Presales</h3><p>Turn an ambiguous need into a decision-ready problem, outcome, and delivery shape.</p></article>
            <article><span>02</span><h3>Client advisory</h3><p>Make trade-offs legible across business value, risk, architecture, operations, and cost.</p></article>
            <article><span>03</span><h3>Delivery leadership</h3><p>Connect architecture decisions to ownership, sequencing, integration, and working evidence.</p></article>
            <article><span>04</span><h3>Stakeholder impact</h3><p>Give executives, engineers, partners, and operators the level of detail each needs to act.</p></article>
          </div>
        </section>

        <section className="impact-story section-pad" aria-labelledby="energy-heading">
          <header className="story-intro">
            <div><span className="story-number">01</span><span className="eyebrow">Enterprise cloud · Global energy organization</span></div>
            <div>
              <h2 id="energy-heading">Custom Azure infrastructure for a complex enterprise environment.</h2>
              <p>
                The work required more than a technically valid target state. The architecture had
                to balance security, scale, reliability, governance, performance, operations, and
                maintainability while remaining deliverable inside real organizational constraints.
              </p>
            </div>
          </header>
          <div className="story-grid">
            <section>
              <span className="eyebrow">Architecture posture</span>
              <h3>Start with the operating reality.</h3>
              <p>
                I framed infrastructure decisions around the client&apos;s risk, ownership, and
                operational model—not a reference diagram in isolation. That created a shared basis
                for decisions across client stakeholders and delivery teams.
              </p>
            </section>
            <section>
              <span className="eyebrow">Leadership signal</span>
              <h3>Keep advice tied to execution.</h3>
              <p>
                The useful output was an architecture that teams could sequence, govern, operate,
                and explain. Where requirements competed, I made the trade-off visible and kept the
                decision connected to the intended business outcome.
              </p>
            </section>
            <section className="verification-panel">
              <span className="eyebrow">Evidence to clear</span>
              <h3>Before naming the client or result</h3>
              <p><Verify>permission to name TotalEnergies and describe the engagement</Verify></p>
              <p><Verify>exact role, ownership, and lifecycle phases</Verify></p>
              <p><Verify>approved Azure services, topology, scope, and scale</Verify></p>
              <p><Verify>measurable delivery, reliability, cost, or operational outcome</Verify></p>
            </section>
          </div>
        </section>

        <section className="impact-story impact-story-dark section-pad" aria-labelledby="payments-heading">
          <header className="story-intro">
            <div><span className="story-number">02</span><span className="eyebrow">Digital payments · Large commerce platform</span></div>
            <div>
              <h2 id="payments-heading">UPI integration shaped as both a system and a delivery program.</h2>
              <p>
                I combined solution architecture, UPI integration depth, and program leadership to
                align customer discussions, gateway integration, security constraints, specialist
                input, staffing, and delivery across locations.
              </p>
            </div>
          </header>
          <div className="story-grid">
            <section>
              <span className="eyebrow">Key decision</span>
              <h3>Choose operability over superficial simplicity.</h3>
              <p>
                A single VPA path was simpler at the surface. A multiple-VPA approach introduced
                coordination cost, but enabled provider choice, clearer isolation and failover,
                provider-level operations, and more explainable reconciliation.
              </p>
            </section>
            <section>
              <span className="eyebrow">Risk discipline</span>
              <h3>Design for uncertain payment outcomes.</h3>
              <p>
                The durable principle is to separate business transactions, provider attempts,
                retries, callbacks, and reconciliation. Exact retries need atomic idempotency;
                unknown outcomes need resolution before another debit—not inference from a trace ID.
              </p>
            </section>
            <section className="verification-panel">
              <span className="eyebrow">Evidence to clear</span>
              <h3>Before publishing scale or impact</h3>
              <p><Verify>permission to name Flipkart Pay and the gateway partners</Verify></p>
              <p><Verify>12-person team and Hyderabad/Bangalore delivery footprint</Verify></p>
              <p><Verify>six-month baseline and three-month delivery outcome</Verify></p>
              <p><Verify>implementation evidence for VPA, idempotency, failover, and reconciliation choices</Verify></p>
            </section>
          </div>
        </section>

        <section className="impact-transfer section-pad" aria-labelledby="transfer-heading">
          <span className="eyebrow">Transferable to Apps &amp; AI</span>
          <div>
            <h2 id="transfer-heading">The technology changes. The leadership system holds.</h2>
            <p>
              AI programs create the same need for outcome clarity, architecture judgment, governed
              integration, production evidence, and cross-functional ownership. I apply the same
              progression: qualify the opportunity, make trade-offs explicit, shape a delivery path,
              and measure what matters across quality, safety, latency, cost, and adoption.
            </p>
            <p><Verify>one approved Apps &amp; AI example and its measurable client outcome</Verify></p>
            <Link href="/advisory/" className="button">Start a conversation <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
      </article>
    </PageShell>
  );
}
