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

async function findContentRoot(dir) {
  const marker = path.join("schema", "content.schema.json");
  if (await exists(path.join(dir, marker))) return dir;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const nested = path.join(dir, entry.name);
    if (await exists(path.join(nested, marker))) return nested;
  }
  throw new Error(`schema/content.schema.json was not found in ${dir}`);
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
  if (!response.ok) throw new Error(`GitHub tarball returned ${response.status} for ${repo}@${ref}`);
  const archive = path.join(dest, "archive.tar.gz");
  await writeFile(archive, Buffer.from(await response.arrayBuffer()));
  await exec("tar", ["-xzf", archive, "-C", dest]);
  await rm(archive);
  return findContentRoot(dest);
}

function skipHeavyDirs(source) {
  const name = path.basename(source);
  return name !== "node_modules" && name !== ".git";
}

export async function fetchContent(options = {}) {
  const repo = options.repo || process.env.CONTENT_REPO || "Senthilsivam41/portfolio-content";
  const ref = options.ref || process.env.CONTENT_REF || "main";
  const token = options.token || process.env.CONTENT_TOKEN || "";
  const outDir = path.resolve(options.out || ".content");
  const assetsDir = path.resolve(options.assets || "public/content-assets");
  let local = options.local || "";

  if (!local && !process.env.GITHUB_ACTIONS && !process.env.CONTENT_REF) {
    const sibling = path.resolve(process.cwd(), "..", "portfolio-content");
    if (await exists(path.join(sibling, "schema", "content.schema.json"))) local = sibling;
  }

  const stagingParent = await import("node:os").then((os) => os.tmpdir());
  const staging = path.join(stagingParent, `portfolio-content-${process.pid}`);
  await rm(staging, { recursive: true, force: true });

  let source = local;
  let sha = "local";
  if (local) {
    if (!(await exists(path.join(local, "schema", "content.schema.json")))) {
      throw new Error(`schema/content.schema.json was not found in ${local}`);
    }
    sha = await localSha(local);
  } else {
    source = await downloadTarball(repo, ref, token, staging);
    sha = await remoteSha(repo, ref, token);
  }

  const next = path.join(stagingParent, `portfolio-content-next-${process.pid}`);
  await rm(next, { recursive: true, force: true });
  await cp(source, next, { recursive: true, filter: skipHeavyDirs });
  if (!(await exists(path.join(next, "schema", "content.schema.json")))) {
    throw new Error("Refusing to replace .content because schema/content.schema.json is missing.");
  }
  await writeFile(path.join(next, ".ref"), `${sha}\n`);
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
