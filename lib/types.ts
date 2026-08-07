export const TOPICS = ["Technology", "Business", "People & Careers"] as const;
export type Topic = (typeof TOPICS)[number];
export type PublishStatus = "draft" | "published";

export interface BaseContent {
  id: string;
  slug: string;
  title: string;
  summary: string;
  topic: Topic;
  coverUrl?: string;
  featured?: boolean;
  status: PublishStatus;
  publishedAt?: string;
  updatedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Article extends BaseContent {
  kind: "article";
  body: string;
  readingMinutes?: number;
}

export interface Talk extends BaseContent {
  kind: "talk";
  videoUrl: string;
  event?: string;
  duration?: string;
  notes?: string;
}

export interface Slide extends BaseContent {
  kind: "slide";
  pdfUrl: string;
  event?: string;
  externalUrl?: string;
}

export interface Project extends BaseContent {
  kind: "project";
  challenge: string;
  approach: string;
  outcomes: string;
  technologies: string[];
  projectUrl?: string;
}

export interface AdvisoryService {
  id: string;
  title: string;
  description: string;
  order: number;
  active: boolean;
}

export interface SiteSettings {
  displayName: string;
  shortName?: string;
  role: string;
  motto: string;
  biography: string;
  portraitUrl?: string;
  socialLinks?: { label: string; url: string }[];
}

export interface PublishedManifest {
  site: SiteSettings;
  services: AdvisoryService[];
  articles: Article[];
  talks: Talk[];
  slides: Slide[];
  projects: Project[];
  generatedAt?: string;
}

export type ContentRecord = Article | Talk | Slide | Project;

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "new" | "reviewed" | "closed";
  createdAt?: string;
}
