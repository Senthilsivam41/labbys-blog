function embedUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.endsWith("youtube.com")) {
      const id = url.searchParams.get("v") ?? url.pathname.split("/").pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname.endsWith("vimeo.com")) return `https://player.vimeo.com/video/${url.pathname.split("/").filter(Boolean).pop()}`;
  } catch { return null; }
  return null;
}

export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const src = embedUrl(url);
  if (!src) return <a className="button button-secondary" href={url} target="_blank" rel="noreferrer">Watch video <span aria-hidden="true">↗</span></a>;
  return <div className="video-frame"><iframe src={src} title={title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>;
}
