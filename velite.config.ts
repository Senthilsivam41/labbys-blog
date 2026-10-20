import { defineCollection, defineConfig, s } from "velite";

const work = defineCollection({
  name: "Work",
  pattern: "work/**/*.mdx",
  schema: s.object({
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
  collections: { work },
  prepare(data) {
    data.work = data.work.filter((item) => item.draft !== true);
  },
});
