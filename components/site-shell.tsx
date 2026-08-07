"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import type { SiteSettings } from "@/lib/types";

const links = [
  ["Articles", "/articles/"],
  ["Talks", "/talks/"],
  ["Slides", "/slides/"],
  ["Work", "/work/"],
  ["About", "/about/"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Labs Built by Sendil, home">
        <BrandLogo className="brand-logo brand-logo-header" eager />
      </Link>
      <button className="menu-button" type="button" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>
        <span>{open ? "Close" : "Menu"}</span><span aria-hidden="true">{open ? "×" : "＋"}</span>
      </button>
      <nav id="primary-navigation" className={open ? "nav-links is-open" : "nav-links"} aria-label="Primary navigation">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className={pathname === href || pathname.startsWith(href) ? "active" : ""}>{label}</Link>
        ))}
        <Link href="/advisory/" className="button button-small">Send an inquiry <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>
  );
}

export function SiteFooter({ site }: { site: SiteSettings }) {
  return (
    <footer className="site-footer">
      <div className="footer-statement">
        <span className="eyebrow">The working principle</span>
        <p>{site.motto}.</p>
      </div>
      <div className="footer-grid">
        <div><strong>{site.displayName}</strong><span>{site.shortName ?? "LabbyS"} · {site.role}</span></div>
        <nav aria-label="Footer navigation">
          <Link href="/articles/">Articles</Link><Link href="/talks/">Talks</Link><Link href="/slides/">Slides</Link><Link href="/work/">Work</Link><Link href="/admin/">Owner sign in</Link>
        </nav>
        <p>Ideas for builders at every stage.<br />© {new Date().getFullYear()} Sendil.</p>
      </div>
    </footer>
  );
}

export function PageShell({ children, site }: { children: React.ReactNode; site: SiteSettings }) {
  return <><SiteHeader /><main>{children}</main><SiteFooter site={site} /></>;
}
