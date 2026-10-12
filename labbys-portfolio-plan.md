# LabbyS Portfolio Plan: Second Brain content, read directly by the site

_Prepared 2026-10-12 (IST). Revised 9:50 PM IST: drop the `portfolio-content` repo. Portfolio content stays in the Second Brain git repo and this site reads it at build time. Hosting is settled: Cloudflare serves the site; the domain is on Hostinger._

_This is a plan only. No application code was changed by this revision._

## 1. Current state

| Item | Finding |
|---|---|
| Live URL | `https://portfolio.labbys-aoai.in` — title "Labs Built by Sendil". Articles, talks, and slides are empty placeholders. |
| Repo | `Senthilsivam41/labbys-blog`, local `/Users/sendils/work/blog-site`, branch `cursor/hostinger-tech-blog-site` |
| Framework | **Next.js 16.2.6 (App Router), React 19, TypeScript 5.9**, `output: "export"` (fully static), `trailingSlash`, unoptimized images |
| Data today | `lib/content.ts` loads a `PublishedManifest` from `CONTENT_API_URL` (Firebase Function + Firestore). If unset, it falls back to a hard-coded manifest where projects, articles, and talks are empty. Firebase Auth still owns `/admin` and the inquiry form. |
| Content from now | **`Senthilsivam41/second-brain-store`** (private). Local clone: `/Users/sendils/work/Knowledge-Store/Second Brain`. Notes live under `Second Brain/wiki/`. |
| Routes today | `/articles` `/talks` `/slides` `/work` `/impact` `/about` `/advisory` `/admin` `/under-review`, plus `rss.xml`, `sitemap.ts`, `robots.ts` |
| Hosting | **Settled.** Cloudflare static assets (`wrangler.jsonc`). Domain `labbys-aoai.in` bought on Hostinger; DNS points the portfolio host at Cloudflare. Firebase stays for Auth, Firestore, and Functions only. |
| Style | Editorial cream theme (`#f3efe5`), `color-scheme: light` only |
| Positioning | Generic "multi-faceted solution architect / advisory". It does not yet say agentic AI, hybrid RAG, knowledge graphs, or data platforms. |

**Gaps**

1. Wiki workstreams and app ideas never reach the site. `/work` and the home "ideas in motion" block are empty.
2. `og:image` falls back to `https://example.github.io/blog-site/og.png` when `NEXT_PUBLIC_SITE_URL` is unset.
3. No JSON-LD Person schema, no search, no analytics, no dark mode.
4. `deploy-firebase.yml` and `deploy-render.yml` are leftover targets. The live path is Cloudflare.
5. `labbys91-firebase-adminsdk-*.json` and `.env` sit in the blog-site root. Both are gitignored. The content loader must not copy them, and must not copy vault paths listed in the denylist.

## 2. Decision (ADR-001)

**Keep Next.js static export on Cloudflare. Read portfolio content directly from `Senthilsivam41/second-brain-store` at build time.** Do not create `portfolio-content`. Do not copy notes into `blog-site`. Firestore stays for inquiries and admin-curated talks and slides.

```
Senthilsivam41/second-brain-store (PRIVATE)
  Second Brain/wiki/…          ← Obsidian notes, the only content source
        │
        │  CI: checkout with a read-only token into gitignored .content/
        │  local: --local "/Users/sendils/work/Knowledge-Store/Second Brain"
        ▼
  scripts/fetch-content.mjs
        │  keep publish: true only
        │  strip <!-- private --> blocks
        │  fail the build if a denylisted path would be emitted
        ▼
  .content/published/  →  Velite  →  next build (output: "export")  →  Cloudflare
```

Why direct, and why a filter still exists:

- One repo to edit. A note merged to `second-brain-store` `main` is the note the site builds. There is no export PR and no second tree to drift.
- The vault is private and mixed (accounts, diet, goals, retirement, API-key paths, Chrome profiles). "Direct" means the site reads those files from git. It does not mean every file becomes HTML. The loader publishes only `publish: true` notes and refuses the denylist. The full checkout stays in gitignored `.content/` and never lands in `out/` or in `blog-site` git.
- `second-brain-store` stays private. jsDelivr and raw GitHub URLs cannot serve it. Live runtime fetch of the vault is rejected. Updates ship as a static rebuild.
- A push to `second-brain-store` `main` sends `repository_dispatch` (`content-updated`, payload `{sha}`) to `labbys-blog`.

**Rejected**

- `Senthilsivam41/portfolio-content` plus a vault exporter. That was the 9:34 PM draft. It added a repo and a sanitizing copy step the content does not need.
- A git submodule of the whole vault inside `blog-site`. That would pin private notes inside the site tree.
- Quartz or Obsidian Digital Garden as the main site. Either would replace this Next.js app.

## 3. Information architecture

Content paths below are inside the vault, relative to `Second Brain/wiki/`. The site never vendors these files.

| Section | Route | Vault path | Notes |
|---|---|---|---|
| Home / hero | `/` | `site.yml` (new, small) + notes with `featured: true` | Positioning: principal solutions architect, agentic AI, hybrid RAG and knowledge graphs, data platforms, 24+ years. Three featured case studies and a "Now building" strip. |
| About + skills | `/about` | `maps/map-skills.md`, `entities/skills-profile.md` | Depth labels Deep / Building / Practice. No fake percentages. Omit "gaps vs goals" and interview notes. |
| Projects | `/work`, `/work/[slug]` | `workstreams/*.md` | Case-study template below. `llm-router.md` stays unpublished (Virtualan). |
| Solution catalog | `/catalog` | `sources/solution-catalog.md` and `workstreams/solution-designs.md` | Reference designs already in the wiki. |
| Ideas Lab | `/lab` | `app-ideas/idea-*.md` | Status from existing frontmatter. Employer-adjacent ideas stay `publish: false` until reviewed. |
| Architecture | `/architecture` | `concepts/architecture-concepts.md`, `concepts/architect-notes.md`, `reference-concepts/*.md` | Only notes marked `publish: true`. |
| Writing | `/articles` | Existing Firestore manifest + RSS | Unchanged. |
| Playbook | `/playbook` | link in `site.yml` | Points at `tech-assist.labbys-aoai.in`. |
| Now / timeline | `/now`, `/timeline` | `log.md` (public lines only), `entities/experience.md` | Role, company, years. No client names. |
| Contact | `/advisory` | Existing Firebase inquiry form | Add Turnstile later. |
| Resume | `/resume` | `sources/experience-resume.md` | HTML page. PDF only from the published slice. |

**Case-study template** for a published workstream: Problem → Constraints → Architecture (Mermaid or Excalidraw SVG already in the note) → Decisions → Stack → Evals → Outcome and status → Links → Related ideas. Hide a section when the note does not have it. Do not invent metrics.

### What may be published

| Item | Vault note | Public? |
|---|---|---|
| KineticGraph-Vectra | `workstreams/kineticgraph.md` | yes, flagship case study |
| AgentLens | `workstreams/agent-lens.md` | yes |
| Agent Synthetix | `workstreams/agent-synthetix.md` | yes |
| Dual-LLM Router | `workstreams/dual-llm-router.md` | yes, kept distinct from Virtualan |
| AetherLake | `workstreams/aetherlake.md` | yes, status parked |
| AnchorText | `workstreams/anchortext.md` | yes, lab card |
| Agentic AI Playbook | `workstreams/agentic-ai-playbook.md` | yes, link card |
| How this site is built | `workstreams/labbys-blog.md` | yes, after a public rewrite (drop Chrome profile and account keys from the page) |
| App ideas (reflexion, zero-retrain PDF, zero-copy lakehouse, zero-ETL, semantic KG, triple store, text annotation, and the other non-employer ideas) | `app-ideas/idea-*.md` | yes after a wording pass |
| RMDM, SAP CRM KG, schema-aware agent | `app-ideas/` and `entities/` | review first; employer-adjacent |
| LLM Router / Virtualan | `workstreams/llm-router.md`, `entities/github-sendils-vlan-49.md` | no |
| Experience, Thoughtworks | `entities/experience.md`, `entities/thoughtworks.md`, `sources/thoughtworks-experience.md` | role-level only |
| Skills | `entities/skills-profile.md`, `maps/map-skills.md` | yes, no gap notes |
| Accounts, diet, goals, Chrome profiles, retirement, weekly reports, API keys | `Accounts.md`, `Fitness.md`, `entities/diet.md`, `entities/goals.md`, `concepts/chrome-profiles.md`, `entities/retirement-plan.md`, `raw/**` | no |

### Publish frontmatter (added on the note, in the vault)

Existing keys (`type`, `status`, `updated`, `tags`) stay. Publishing adds:

```yaml
publish: true                 # required to appear on the site; default is false
public_title: "KineticGraph" # optional override of the H1
public_summary: "…"          # required when publish is true, ≤ 400 chars
slug: kineticgraph            # optional; default is the filename
featured: false
```

`<!-- private --> … <!-- /private -->` blocks are removed before render. Wikilinks to unpublished notes become plain text. Wikilinks to published notes become site links.

## 4. How the site reads the vault

### 4.1 Loader

`scripts/fetch-content.mjs` in `blog-site`:

- `CONTENT_REPO=Senthilsivam41/second-brain-store` (default)
- `CONTENT_REF` defaults to `main`; the dispatch passes the sha
- `CONTENT_TOKEN` is a fine-grained PAT, **Contents: read-only**, on `second-brain-store` only. Required, because the repo is private.
- `--local "/Users/sendils/work/Knowledge-Store/Second Brain"` for offline dev. No network in that mode.
- Download or copy into a temp dir, then write only the published slice to `.content/published/`.
- Copy referenced images for published notes to `public/content-assets/` (gitignored).
- Write `.content/.ref` with the sha.
- Exit non-zero if the fetch fails, if `publish: true` is missing a summary, or if any denylist hit is in the published slice. A failed fetch must not deploy an empty site over a good one: the workflow keeps the previous deployment.

Denylist (paths and regexes), applied to the published slice:

- Paths: `raw/`, `Accounts.md`, `Fitness.md`, `entities/diet.md`, `entities/goals.md`, `entities/retirement-plan.md`, `concepts/chrome-profiles.md`, `concepts/github-accounts.md`, `sources/diet-preference.md`, `sources/personal-goals.md`, `sources/weekly-project-status-*`, `entities/github-sendils-vlan-49.md`, `workstreams/llm-router.md`
- Regexes: `Virtualan`, `sendils-vlan`, API key assignments, email addresses, phone numbers

`.content/`, `.velite/`, and `public/content-assets/` are gitignored.

### 4.2 Build

- `prebuild` / `predev`: `node scripts/fetch-content.mjs && velite build`
- Velite collections read `.content/published/**` only: work, lab, catalog, architecture, plus singletons for `site.yml`, skills, timeline, and resume.
- `deploy-cloudflare.yml` triggers on `repository_dispatch: [content-updated]`, `push` to the site's deploy branch, and `workflow_dispatch`.
- Steps: checkout → fetch content at `CONTENT_REF` → `npm run check` → `wrangler deploy`.
- Secrets: `CONTENT_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

### 4.3 Vault side (small)

One workflow in `second-brain-store`: on push to `main`, `repository_dispatch` to `Senthilsivam41/labbys-blog` with `event-type: content-updated` and `client_payload.sha`. Token is a fine-grained PAT with **Contents: read and write on labbys-blog only** (dispatch needs that), stored as `DISPATCH_TOKEN`. It does not need write access to the vault.

No exporter script. No second content repo.

## 5. Build prompts

Standard preamble for every prompt:

```
Repo: /Users/sendils/work/blog-site (Next.js 16 App Router, React 19, TS, output:"export", Firebase for auth/inquiries).
Content rule: portfolio content lives ONLY in Senthilsivam41/second-brain-store (local: /Users/sendils/work/Knowledge-Store/Second Brain). The site reads it at build time into gitignored .content/ and publishes only notes with publish: true. Never copy vault files into blog-site git. Never publish raw/, accounts, diet, goals, retirement, Chrome profiles, or API keys.
Rules: branch feature/<name> from the current branch. Do not commit, push, or open PRs unless I ask.
Keep the static export working: npm run check must pass. No secrets in code. Never read *-firebase-adminsdk-*.json or .env.
```

1. **ADR (`feature/adr-hosting`)**: Write `docs/adr/0001-hosting.md`. Decision: Cloudflare static assets, Hostinger DNS, content read from `second-brain-store` at build time. List `deploy-render.yml` and `deploy-firebase.yml` as retire-later. Do not delete them in this change.
2. **Loader (`feature/content-loader`)**: `scripts/fetch-content.mjs`, Velite, `prebuild`/`predev`, gitignore, `deploy-cloudflare.yml` with `repository_dispatch`. `--local` points at the Second Brain clone. Denylist test must fail the build on a fixture that includes `Accounts.md` or a `Virtualan` string inside a `publish: true` note. Leave the Firestore manifest in place for talks and slides.
3. **Publish flags (`feature/publish-flags`, vault)**: Add `publish`, `public_summary`, and `slug` to KineticGraph, AgentLens, and Agent Synthetix only. Strip or wrap account-specific lines in `<!-- private -->`. Do not publish `llm-router.md`.
4. **Case studies (`feature/case-studies`)**: `/work` and `/work/[slug]` from the published workstreams. Hide missing sections. Status badges.
5. **Lab and catalog (`feature/lab-catalog`)**: `/lab` from published `app-ideas/`, `/catalog` from the solution-catalog notes.
6. **OG and canonical (`feature/og-images`)**: `metadataBase` from `NEXT_PUBLIC_SITE_URL=https://portfolio.labbys-aoai.in`. Real OG image per route. Test that no page references `example.github.io`.
7. **Theme and SEO (`feature/theme-seo`)**: Light / dark / system. JSON-LD Person from published skills only, `sameAs` from public social links already on the site.
8. **Search, analytics, contact (`feature/search-analytics-contact`)**: Pagefind, Cloudflare Web Analytics, Turnstile on the inquiry form.
9. **Timeline, now, resume (`feature/timeline-resume`)**: From published experience notes only. Skip the page with a warning if the published slice has no resume note.
10. **Ask my portfolio (`feature/ask-portfolio`)**: Index the published slice only (never `.content/` before the filter). Workers AI + Vectorize, citations, Turnstile, rate limit. Refuse personal-data questions.

Diagrams, skill filter, and the skills graph stay as later prompts. They read the same published slice.

## 6. Roadmap

**Week 1.** ADR, then the loader and a denylist test, then `publish: true` on KineticGraph, AgentLens, and Agent Synthetix, then `/work` and `/work/[slug]`. Fix OG and `metadataBase` in the same week so the live host stops advertising `example.github.io`.

**Week 2.** Ideas Lab, catalog, architecture index, diagrams, skill filter.

**Week 3.** Timeline, resume, dark mode, search, analytics, Turnstile. Ask-my-portfolio behind a flag, indexed from the published slice only.

## 7. Tools

| Category | Tool | Why |
|---|---|---|
| Content fetch | giget or Octokit tarball | Private-repo download with `CONTENT_TOKEN` |
| Local dev | `--local` copy | Reads the clone already on this Mac |
| Rebuild trigger | `peter-evans/repository-dispatch` | Vault `main` → site rebuild |
| Collections | Velite | Typed collections over `.content/published` |
| Markdown | gray-matter, remark-gfm | Frontmatter and tables |
| Search | Pagefind | Static index of `out/` |
| Deploy | Wrangler | Cloudflare |
| Anti-spam | Turnstile | Inquiry form and, later, the ask box |

jsDelivr is not used. The content repo is private.

## 8. Inspiration

| Who | Why look | Link |
|---|---|---|
| Eugene Yan | Writing-led portfolio; pattern posts as case studies | https://eugeneyan.com |
| Hamel Husain | Evals-focused writing, close to AgentLens | https://hamel.dev |
| Martin Fowler | Architecture-first notes with diagrams | https://martinfowler.com |
| Also | Chip Huyen, Simon Willison, Brittany Chiang | https://chiphuyen.com · https://simonwillison.net · https://brittanychiang.com |
