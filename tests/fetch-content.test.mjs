import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fetchContent } from "../scripts/fetch-content.mjs";

const contentRoot = path.resolve("..", "portfolio-content");

test("fetch-content copies a local repo and records the ref", async () => {
  const out = await mkdtemp(path.join(tmpdir(), "content-out-"));
  const assets = await mkdtemp(path.join(tmpdir(), "content-assets-"));
  const result = await fetchContent({ local: contentRoot, out, assets });
  const ref = await readFile(path.join(out, ".ref"), "utf8");
  assert.equal(result.sha, ref.trim());
  await access(path.join(out, "schema", "content.schema.json"));
  await access(path.join(out, "work", "kineticgraph.mdx"));
  await access(path.join(assets, "kineticgraph", "arch.svg"));
  await assert.rejects(access(path.join(out, "node_modules")));
});

test("fetch-content fails when the local directory has no schema", async () => {
  const missing = await mkdtemp(path.join(tmpdir(), "content-missing-"));
  const out = await mkdtemp(path.join(tmpdir(), "content-out-"));
  await assert.rejects(() => fetchContent({ local: missing, out, assets: out }));
  await assert.rejects(access(path.join(out, ".ref")));
});
