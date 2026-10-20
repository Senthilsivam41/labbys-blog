#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

function parseArgs(argv) {
  const options = {
    local: process.env.CONTENT_LOCAL || "",
    out: process.env.CONTENT_OUT || ".content",
    assets: process.env.CONTENT_ASSETS || "public/content-assets",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--local") options.local = argv[++index] ?? "";
    else if (arg === "--out") options.out = argv[++index] ?? options.out;
    else if (arg === "--assets") options.assets = argv[++index] ?? options.assets;
  }
  return options;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function findWiki(dir, depth = 0) {
  if (await exists(path.join(dir, "wiki", "workstreams"))) return path.join(dir, "wiki");
  if (path.basename(dir) === "wiki" && (await exists(path.join(dir, "workstreams")))) return dir;
  if (depth >= 4) return null;
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "node_modules" || entry.name === ".git" || entry.name === "raw") continue;
    const found = await findWiki(path.join(dir, entry.name), depth + 1);
    if (found) return found;
  }
  return null;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: text };
  const data = {};
  let key = null;
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && key) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(item[1].trim().replace(/^["']|["']$/g, ""));
      continue;
    }
    const field = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!field) continue;
    key = field[1];
    const value = field[2].trim().replace(/^["']|["']$/g, "");
    data[key] = value === "" ? [] : value;
  }
  return { data, body: text.slice(match[0].length) };
}

function publishedCaseStudy(data) {
  if (data.publish !== "true" && data.publish !== true) return false;
  const skills = Array.isArray(data.skills) ? data.skills : [];
  return ["title", "slug", "section", "summary", "status", "updated"].every((key) => typeof data[key] === "string" && data[key] !== "") && skills.length > 0;
}

function caseStudyDocument(data, body) {
  const skills = data.skills.map((skill) => `  - ${skill}`).join("\n");
  const related = Array.isArray(data.related) && data.related.length ? `\nrelated:\n${data.related.map((item) => `  - ${item}`).join("\n")}` : "";
  const diagram = data.diagram ? `\ndiagram: ${data.diagram}` : "";
  const repo = typeof data.repo === "string" && data.repo ? `\nrepo: ${data.repo}` : "";
  const featured = data.featured === "true" || data.featured === true ? "\nfeatured: true" : "";
  return `---
title: "${data.title.replace(/"/g, '\\"')}"
slug: ${data.slug}
section: ${data.section}
summary: "${String(data.summary).replace(/"/g, '\\"')}"
status: ${data.status}
skills:
${skills}
updated: "${data.updated}"${diagram}${repo}${featured}${related}
draft: false
---

${body.trim()}
`;
}

async function localSha(dir) {
  try {
    const { stdout } = await exec("git", ["-C", dir, "rev-parse", "HEAD"]);
    return stdout.trim();
  } catch {
    return "local";
  }
}

async function remoteSha(repo, ref, token) {
  if (/^[0-9a-f]{40}$/i.test(ref)) return ref;
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "labbys-blog-fetch-content" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com/repos/${repo}/commits/${ref}`, { headers });
  if (!response.ok) return ref;
  const body = await response.json();
  return typeof body.sha === "string" ? body.sha : ref;
}

async function downloadTarball(repo, ref, token, dest) {
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "labbys-blog-fetch-content" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com/repos/${repo}/tarball/${ref}`, { headers, redirect: "follow" });
  if (!response.ok) {
    const error = new Error(`GitHub tarball returned ${response.status} for ${repo}@${ref}`);
    error.status = response.status;
    throw error;
  }
  const archive = path.join(dest, "archive.tar.gz");
  await writeFile(archive, Buffer.from(await response.arrayBuffer()));
  await exec("tar", ["-xzf", archive, "-C", dest]);
  await rm(archive);
  return dest;
}

function skipHeavyDirs(source) {
  const name = path.basename(source);
  return name !== "node_modules" && name !== ".git";
}

async function localVault() {
  const candidates = [
    path.resolve(process.cwd(), "..", "Knowledge-Store", "Second Brain"),
    path.resolve(process.cwd(), "..", "second-brain-store"),
  ];
  for (const candidate of candidates) {
    if (await findWiki(candidate)) return candidate;
  }
  return "";
}

async function projectWiki(wiki, sha, dest) {
  await rm(dest, { recursive: true, force: true });
  await mkdir(path.join(dest, "work"), { recursive: true });
  const workstreams = path.join(wiki, "workstreams");
  const entries = await readdir(workstreams);
  for (const name of entries) {
    if (!name.endsWith(".md") && !name.endsWith(".mdx")) continue;
    const text = await readFile(path.join(workstreams, name), "utf8");
    const { data, body } = parseFrontmatter(text);
    if (!publishedCaseStudy(data)) continue;
    const slug = data.slug;
    await writeFile(path.join(dest, "work", `${slug}.mdx`), caseStudyDocument(data, body));
  }
  await writeFile(path.join(dest, ".ref"), `${sha}\n`);
  const assets = path.join(wiki, "assets");
  if (await exists(assets)) await cp(assets, path.join(dest, "assets"), { recursive: true, filter: skipHeavyDirs });
}

export async function fetchContent(options = {}) {
  const repo = options.repo || process.env.CONTENT_REPO || "Senthilsivam41/second-brain-store";
  const ref = options.ref || process.env.CONTENT_REF || "main";
  const token = options.token || process.env.CONTENT_TOKEN || "";
  const outDir = path.resolve(options.out || ".content");
  const assetsDir = path.resolve(options.assets || "public/content-assets");
  let local = options.local || "";

  if (!local && !process.env.GITHUB_ACTIONS && !process.env.CONTENT_REF) local = await localVault();

  const stagingParent = await import("node:os").then((os) => os.tmpdir());
  const staging = path.join(stagingParent, `second-brain-${process.pid}`);
  await rm(staging, { recursive: true, force: true });

  let wiki = null;
  let sha = "local";
  if (local) {
    wiki = await findWiki(local);
    if (!wiki) throw new Error(`Second Brain/wiki/workstreams was not found in ${local}`);
    sha = await localSha(local);
  } else {
    try {
      const source = await downloadTarball(repo, ref, token, staging);
      wiki = await findWiki(source);
      if (!wiki) throw new Error(`Second Brain/wiki/workstreams was not found in ${repo}@${ref}`);
      sha = await remoteSha(repo, ref, token);
    } catch (error) {
      if (error && error.status === 404 && !token) {
        console.warn(`Content repo ${repo}@${ref} is not readable without CONTENT_TOKEN. Publishing no vault notes.`);
        wiki = null;
        sha = "unavailable";
      } else {
        throw error;
      }
    }
  }

  const next = path.join(stagingParent, `second-brain-next-${process.pid}`);
  if (wiki) await projectWiki(wiki, sha, next);
  else {
    await rm(next, { recursive: true, force: true });
    await mkdir(path.join(next, "work"), { recursive: true });
    await writeFile(path.join(next, ".ref"), `${sha}\n`);
  }
  await placeDirectory(next, outDir);

  await rm(assetsDir, { recursive: true, force: true });
  const assetsSource = path.join(outDir, "assets");
  if (await exists(assetsSource)) {
    await mkdir(path.dirname(assetsDir), { recursive: true });
    await cp(assetsSource, assetsDir, { recursive: true });
  }

  await rm(staging, { recursive: true, force: true });
  return { outDir, sha };
}

async function placeDirectory(from, to) {
  const { rename } = await import("node:fs/promises");
  await rm(to, { recursive: true, force: true });
  await mkdir(path.dirname(to), { recursive: true });
  try {
    await rename(from, to);
  } catch (error) {
    if (!error || error.code !== "EXDEV") throw error;
    await cp(from, to, { recursive: true });
    await rm(from, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(process.argv[1]);
if (invokedDirectly && process.argv[1].endsWith("fetch-content.mjs")) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await fetchContent(options);
    const ref = await readFile(path.join(result.outDir, ".ref"), "utf8");
    console.log(`Content ready at ${result.outDir} (${ref.trim()})`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
