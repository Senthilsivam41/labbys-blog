import { work } from "#site/content";

export type CaseStudy = (typeof work)[number];

export function publishedWork(): CaseStudy[] {
  return [...work].filter((item) => item.draft !== true).sort((a, b) => b.updated.localeCompare(a.updated));
}

export function workBySlug(slug: string): CaseStudy | undefined {
  return publishedWork().find((item) => item.slug === slug);
}

export function diagramUrl(diagram?: string): string | undefined {
  if (!diagram) return undefined;
  const relative = diagram.replace(/^assets\//, "");
  return `/content-assets/${relative}`;
}
