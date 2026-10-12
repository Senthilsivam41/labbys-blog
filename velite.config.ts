import { defineCollection, defineConfig, s } from "velite";

const entry = s.object({
  title: s.string().min(1),
  slug: s.string().regex(/^[a-z0-9-]+$/),
  section: s.enum(["work", "lab", "catalog", "adr"]),
  summary: s.string().min(1).max(400),
  status: s.enum(["lab", "active", "parked", "shipped", "idea", "prototype", "absorbed"]),
  skills: s.array(s.string().min(1)).min(1),
  updated: s.isodate(),
  repo: s.string().url().optional(),
  diagram: s.string().optional(),
  featured: s.boolean().optional(),
  related: s.array(s.string()).optional(),
  draft: s.boolean().default(false),
  source_note: s.string().optional(),
  body: s.markdown(),
});

const work = defineCollection({ name: "Work", pattern: "work/**/*.mdx", schema: entry });
const lab = defineCollection({ name: "Lab", pattern: "lab/**/*.mdx", schema: entry });
const catalog = defineCollection({ name: "Catalog", pattern: "catalog/**/*.mdx", schema: entry });
const adr = defineCollection({ name: "Adr", pattern: "adr/**/*.md", schema: entry });

const site = defineCollection({
  name: "SiteProfile",
  pattern: "site.yml",
  single: true,
  schema: s.object({
    hero: s.object({ eyebrow: s.string(), title: s.string(), lede: s.string() }),
    positioning: s.string(),
    featured: s.array(s.string()),
    links: s.object({ playbook: s.string().url(), techBlog: s.string().url() }),
  }),
});

const skills = defineCollection({
  name: "Skills",
  pattern: "skills.yml",
  single: true,
  schema: s.object({
    areas: s.array(s.object({
      id: s.string(),
      label: s.string(),
      depth: s.enum(["Deep", "Building", "Practice"]),
    })),
  }),
});

const timeline = defineCollection({
  name: "Timeline",
  pattern: "timeline.yml",
  single: true,
  schema: s.object({
    roles: s.array(s.object({
      company: s.string(),
      title: s.string(),
      years: s.string(),
      summary: s.string().optional(),
    })),
    milestones: s.array(s.object({
      date: s.string(),
      title: s.string(),
      summary: s.string().optional(),
    })),
  }),
});

const now = defineCollection({
  name: "Now",
  pattern: "now.yml",
  single: true,
  schema: s.object({
    updated: s.string(),
    focus: s.array(s.string()).min(1),
  }),
});

const resume = defineCollection({
  name: "Resume",
  pattern: "resume.json",
  single: true,
  schema: s.object({
    $schema: s.string().optional(),
    basics: s.object({
      name: s.string(),
      label: s.string(),
      summary: s.string(),
      url: s.string().optional(),
    }),
    work: s.array(s.object({
      name: s.string(),
      position: s.string(),
      summary: s.string(),
    })).optional(),
    skills: s.array(s.object({
      name: s.string(),
      level: s.string(),
    })).optional(),
  }),
});

export default defineConfig({
  root: ".content",
  strict: true,
  output: {
    data: ".velite",
    assets: "public/content-assets",
    base: "/content-assets/",
    clean: false,
  },
  collections: { work, lab, catalog, adr, site, skills, timeline, now, resume },
  prepare(data) {
    data.work = data.work.filter((item) => item.draft !== true);
    data.lab = data.lab.filter((item) => item.draft !== true);
    data.catalog = data.catalog.filter((item) => item.draft !== true);
    data.adr = data.adr.filter((item) => item.draft !== true);
  },
});
