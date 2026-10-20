export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function contentHref(kind: "article" | "project", slug: string): string {
  return kind === "article" ? `/articles/${slug}/` : `/work/${slug}/`;
}
