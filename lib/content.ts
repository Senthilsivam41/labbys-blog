import type { PublishedManifest } from "./types";

export const fallbackManifest: PublishedManifest = {
  site: {
    displayName: "Labs Built by Sendil",
    shortName: "LabbyS",
    role: "Multi-faceted Solution Architect",
    motto: "What we can achieve with what we have",
    biography:
      "A working lab for useful ideas—where technology, business, and people come together to turn constraints into practical progress.",
    socialLinks: [],
  },
  services: [
    { id: "strategy", title: "Technical strategy", description: "Turn business intent into a practical technology direction, roadmap, and set of decisions.", order: 1, active: true },
    { id: "architecture", title: "Solution architecture", description: "Review, shape, or simplify systems so they can grow with clarity and resilience.", order: 2, active: true },
    { id: "ai", title: "AI & automation", description: "Find grounded ways to apply AI and automation to real workflows, teams, and products.", order: 3, active: true },
    { id: "startup", title: "Startup guidance", description: "Support founders with MVP choices, technical trade-offs, and the path from idea to execution.", order: 4, active: true },
    { id: "career", title: "Career mentoring", description: "Help students, freshers, and technical professionals build judgment, confidence, and momentum.", order: 5, active: true },
  ],
  articles: [],
  talks: [],
  slides: [],
  projects: [],
};

function isManifest(value: unknown): value is PublishedManifest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PublishedManifest>;
  return Boolean(candidate.site && Array.isArray(candidate.articles) && Array.isArray(candidate.talks) && Array.isArray(candidate.slides) && Array.isArray(candidate.projects));
}

export async function getPublishedManifest(): Promise<PublishedManifest> {
  const endpoint = process.env.CONTENT_API_URL ?? process.env.NEXT_PUBLIC_CONTENT_API_URL;
  if (!endpoint) return fallbackManifest;

  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Content API returned ${response.status}`);
    const data: unknown = await response.json();
    return isManifest(data) ? data : fallbackManifest;
  } catch (error) {
    if (process.env.CI) throw error;
    console.warn("Using built-in content because the content API is unavailable.");
    return fallbackManifest;
  }
}

export function byDate<T extends { publishedAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export function formatDate(value?: string): string {
  if (!value) return "Coming soon";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value));
}
