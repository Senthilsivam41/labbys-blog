import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("brand identity and public navigation are present", async () => {
  const [home, shell, content] = await Promise.all([read("app/page.tsx"), read("components/site-shell.tsx"), read("lib/content.ts")]);
  assert.match(home, /Make thoughtful things/);
  assert.match(home, /Students, interns/);
  for (const label of ["Articles", "Talks", "Slides", "Work", "About", "Send an inquiry"]) assert.match(shell, new RegExp(label));
  assert.match(content, /shortName: "LabbyS"/);
});

test("GitHub Pages build uses a repository base path", async () => {
  const config = await read("next.config.ts");
  assert.match(config, /GITHUB_REPOSITORY/);
  assert.match(config, /basePath/);
  assert.match(config, /output: "export"/);
});

test("Firebase rules default to deny and protect inquiries", async () => {
  const rules = await read("firestore.rules");
  assert.match(rules, /match \/inquiries\/\{id\}/);
  assert.match(rules, /allow create: if false/);
  assert.match(rules, /match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
});

test("publishing trigger keeps the GitHub token server-side", async () => {
  const [functions, dashboard] = await Promise.all([read("functions/src/index.ts"), read("components/admin-dashboard.tsx")]);
  assert.match(functions, /defineSecret\("GITHUB_DISPATCH_TOKEN"\)/);
  assert.match(functions, /repository_dispatch|dispatches/);
  assert.doesNotMatch(dashboard, /GITHUB_DISPATCH_TOKEN/);
});

test("runtime state is private and can only be written by trusted backend code", async () => {
  const [rules, functions, claimScript] = await Promise.all([
    read("firestore.rules"),
    read("functions/src/index.ts"),
    read("functions/scripts/set-admin-claim.mjs"),
  ]);
  assert.match(rules, /match \/userRuntime\/\{userId\}/);
  assert.match(rules, /request\.auth\.uid == userId/);
  assert.match(rules, /allow list, create, update, delete: if false/);
  assert.match(functions, /consumeAppCheckToken: true/);
  assert.match(functions, /request\.auth\.token\.admin !== true/);
  assert.match(functions, /securityEvent: true/);
  assert.match(claimScript, /--expected-email/);
  assert.match(claimScript, /setCustomUserClaims/);
});

test("local Firebase services are explicitly connected to the demo emulators", async () => {
  const firebase = await read("lib/firebase.ts");
  assert.match(firebase, /NEXT_PUBLIC_USE_FIREBASE_EMULATORS/);
  assert.match(firebase, /127\.0\.0\.1", 8080/);
  assert.match(firebase, /FIREBASE_APPCHECK_DEBUG_TOKEN/);
});

test("blocked owners are guarded by a no-index review route", async () => {
  const [guard, page, dashboard] = await Promise.all([
    read("components/runtime-guard.tsx"),
    read("app/under-review/page.tsx"),
    read("components/admin-dashboard.tsx"),
  ]);
  assert.match(guard, /collection\("userRuntime"\)\.doc\(user\.uid\)/);
  assert.match(guard, /window\.location\.replace/);
  assert.match(guard, /state === "unavailable"/);
  assert.match(page, /index: false/);
  assert.match(dashboard, /<RuntimeGuard/);
});
