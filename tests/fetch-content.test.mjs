import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fetchContent } from "../scripts/fetch-content.mjs";

const note = `---
publish: true
title: "KineticGraph: hybrid RAG over a knowledge graph"
slug: kineticgraph
section: work
summary: A hybrid retrieval design that combines vector search, a knowledge graph, and keyword rank.
status: active
skills:
  - agentic-ai
updated: "2026-10-12"
---

Public architecture note.
`;

test("fetch-content reads Second Brain/wiki/workstreams and keeps unpublished notes out", async () => {
  const vault = await mkdtemp(path.join(tmpdir(), "wiki-vault-"));
  const workstreams = path.join(vault, "Second Brain", "wiki", "workstreams");
  await mkdir(workstreams, { recursive: true });
  await writeFile(path.join(workstreams, "kineticgraph.md"), note);
  await writeFile(path.join(workstreams, "private.md"), "---\ntitle: Private\nslug: private\n---\n\nDo not publish.\n");
  const out = await mkdtemp(path.join(tmpdir(), "content-out-"));
  const assets = await mkdtemp(path.join(tmpdir(), "content-assets-"));
  const result = await fetchContent({ local: vault, out, assets });
  const ref = await readFile(path.join(out, ".ref"), "utf8");
  assert.equal(result.sha, ref.trim());
  const published = await readFile(path.join(out, "work", "kineticgraph.mdx"), "utf8");
  assert.match(published, /slug: kineticgraph/);
  await assert.rejects(access(path.join(out, "work", "private.mdx")));
});

test("fetch-content fails when the local directory has no wiki workstreams", async () => {
  const missing = await mkdtemp(path.join(tmpdir(), "content-missing-"));
  const out = await mkdtemp(path.join(tmpdir(), "content-out-"));
  await assert.rejects(() => fetchContent({ local: missing, out, assets: out }), /wiki\/workstreams/);
});
