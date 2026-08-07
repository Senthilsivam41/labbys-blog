import Link from "next/link";
import type { ContentRecord } from "@/lib/types";
import { contentHref } from "@/lib/paths";
import { formatDate } from "@/lib/content";

export function ContentCard({ item }: { item: ContentRecord }) {
  const href = item.kind === "article" || item.kind === "project" ? contentHref(item.kind, item.slug) : item.kind === "talk" ? "/talks/" : "/slides/";
  return (
    <article className="content-card">
      <Link href={href} className="card-link" aria-label={`Open ${item.title}`}>
        <div className={`card-art card-art-${item.topic.toLowerCase().replaceAll(" ", "-").replace("&", "and")}`} aria-hidden="true">
          <span>{item.kind === "article" ? "Read" : item.kind === "talk" ? "Watch" : item.kind === "slide" ? "View" : "Explore"}</span>
          <b>{item.topic.charAt(0)}</b>
        </div>
        <div className="card-meta"><span>{item.topic}</span><span>{formatDate(item.publishedAt)}</span></div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <span className="text-link">Open {item.kind} <span aria-hidden="true">↗</span></span>
      </Link>
    </article>
  );
}
