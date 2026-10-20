# Host static assets on Cloudflare and read portfolio content at build time

- Status: accepted
- Date: 2026-10-12

## Context and Problem Statement

`portfolio.labbys-aoai.in` is a Next.js static export. The domain `labbys-aoai.in` is registered at Hostinger. The repository still contains workflows for Firebase Hosting, Render, and a nearly empty `wrangler.jsonc`. Portfolio case studies need a place to live that is not the application repo.

## Decision Drivers

- Pages must be static HTML: fast, cheap, and free of a runtime content database.
- DNS for `labbys-aoai.in` stays at Hostinger. The site itself should not be hosted there.
- A content change must rebuild the site from a known git sha.
- Talks, slides, inquiries, and owner sign-in already use Firebase. That does not have to host the HTML.
- Rollback must be a previous static deployment, not a database restore.

## Considered Options

1. Cloudflare Workers static assets via `wrangler.jsonc`
2. Firebase Hosting
3. Render
4. Hostinger static hosting

## Decision Outcome

Chosen option: **Cloudflare Workers static assets**, because the live site is already on Cloudflare, the account can later hold Web Analytics and the ask-the-portfolio worker, and `output: "export"` maps directly to an `assets.directory`.

**DNS.** Hostinger keeps the `labbys-aoai.in` zone. `portfolio.labbys-aoai.in` is the canonical portfolio host and points at Cloudflare. `tech-blog.labbys-aoai.in` is not a second copy of this build; writing stays on the existing articles route until a host split is explicit.

**Content source: external repo `portfolio-content` fetched at build (option a+d).** `scripts/fetch-content.mjs` downloads `Senthilsivam41/portfolio-content` at `CONTENT_REF` (the dispatch sha, or `main`) into gitignored `.content/`. Velite then builds typed collections from that directory. Drafts are omitted. Firestore remains the source for talks, slides, and inquiries. Local builds pass `--local` or use the sibling checkout at `../portfolio-content`.

### Consequences

- A content merge to `portfolio-content` `main` dispatches `content-updated` and this repo rebuilds. The site repo does not commit the markdown.
- A failed fetch fails the build and leaves the previous Cloudflare deployment in place.
- `CONTENT_TOKEN` is required only if `portfolio-content` is private. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` deploy the `out/` directory.

## Confirmation

- **Cost.** Static asset requests on the existing Cloudflare account. No Render service and no Hostinger application runtime for this site. Firebase remains for Auth, Firestore, and Functions only.
- **Rollback.** Redeploy the previous Cloudflare deployment, or rerun this workflow with an older `CONTENT_REF`.
- **NFRs.** HTML is static. Content-hashed `/_next/static` stays cacheable. The content sha is written to `.content/.ref` for the build that produced the HTML.

## Workflows and config

| File | Action |
|---|---|
| `wrangler.jsonc` | Keep. `assets.directory` is `./out`. |
| `.github/workflows/deploy-cloudflare.yml` | Keep. Triggers: `repository_dispatch` `content-updated`, push to `main`, `workflow_dispatch`. |
| `.github/workflows/validate.yml` | Keep. Runs on every push and pull request. |
| `.github/workflows/deploy-firebase.yml` | Keep for now. It deploys Functions, Firestore, and Storage only, and only on `workflow_dispatch`. Do not use it for the public HTML. |
| `.github/workflows/deploy-render.yml` | Removed. Cloudflare is the host. |
| `.hostinger/site.json` | Removed. Hostinger remains DNS, not the static host. |
| `firebase.json` | Keep for Auth, Firestore, Functions, and emulators. |
