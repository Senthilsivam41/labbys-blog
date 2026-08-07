# Labs Built by Sendil

An editorial portfolio, publishing library, and private owner workspace for Sendil. The public site is statically exported to GitHub Pages; Firebase supplies owner authentication, content records, file storage, inquiries, and the publish-to-GitHub trigger.

## Local preview

1. Copy `.env.example` to `.env.local` and add the Firebase web-app settings.
2. Set `NEXT_PUBLIC_ADMIN_EMAIL` to the single Google account allowed into the owner workspace.
3. Run `npm install`, then `npm run dev`.
4. Visit the public site at the printed local address and `/admin/` for the owner workspace.

Without Firebase settings the public site still renders its complete launch state; the admin page shows a configuration guide and the inquiry form remains disabled.

The owner workspace loads Firebase’s official browser SDK from Google’s CDN at runtime, keeping the static GitHub Pages bundle independent from backend credentials.

## Firebase setup

Create a Firebase project on the Blaze plan and enable:

- Google authentication
- Cloud Firestore
- Cloud Storage
- App Check with reCAPTCHA Enterprise
- Cloud Functions

Before a manual rules deployment, replace `OWNER_EMAIL_REPLACE_ME` in both rules files. The included Firebase deployment workflow does this from the `ADMIN_EMAIL` repository secret.

Configure the function parameters and secrets:

```text
ADMIN_EMAIL        the owner Google email
GITHUB_OWNER       the GitHub account or organization
GITHUB_REPO        blog-site (or the selected repository)
GITHUB_DISPATCH_TOKEN  a fine-grained token limited to that repository
INQUIRY_HASH_SALT      a long random value used only for rate-limit hashes
```

The GitHub token belongs in Firebase Secret Manager. It must never be added to a `NEXT_PUBLIC_` value, repository file, Firestore document, or GitHub Pages build output.

Deploy the rules, indexes, storage policy, and functions with the “Deploy Firebase backend” workflow. After deployment, copy the `publishedContentManifest` function URL into the `CONTENT_API_URL` GitHub repository secret.

## GitHub Pages setup

Enable GitHub Pages with **GitHub Actions** as its source. Add the following repository secrets:

- `ADMIN_EMAIL`
- `CONTENT_API_URL`
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_APP_CHECK_SITE_KEY`
- `FIREBASE_TOKEN` for the manual backend deployment workflow

Every push to `main`, manual dispatch, or `content-published` repository dispatch runs checks, exports the site with its repository base path, and deploys the new Pages artifact. A failed build does not replace the previous successful deployment.

## Content workflow

- Create and preview drafts in `/admin/`.
- Articles use Markdown with GitHub-flavored tables, links, and code blocks.
- Talks accept YouTube and Vimeo links.
- Slides accept PDFs up to 25 MB.
- Publishing promotes private draft assets, marks the record public, and requests a fresh GitHub Pages build.
- Advisory inquiries are visible only in the private Inbox and can be marked new, reviewed, or closed.

## Quality checks

Run `npm run check` for lint, contract tests, and a production static export. Build the backend separately with `npm run build --prefix functions`.

Owner-claim assignment, local emulator setup, App Check debug-token handling, and the admin security-alert filter are documented in [`docs/firebase-security-operations.md`](docs/firebase-security-operations.md).
