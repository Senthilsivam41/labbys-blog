import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "blog-site";
const isProjectPages = process.env.GITHUB_PAGES === "true";
const basePath = isProjectPages ? `/${repositoryName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  turbopack: { root: process.cwd() },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
