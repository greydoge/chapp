const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_URL_PATTERN = /https?:\/\/[^\s<>()"]+/g;
const TRAILING_PUNCTUATION = /[.,!?;:]+$/;

function splitTrailingPunctuation(url: string) {
  const match = url.match(TRAILING_PUNCTUATION);
  const trailing = match?.[0] ?? "";
  return {
    href: trailing ? url.slice(0, -trailing.length) : url,
    trailing,
  };
}

function parseUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function extractYouTubeUrls(text: string) {
  return (text.match(YOUTUBE_URL_PATTERN) ?? [])
    .map((url) => splitTrailingPunctuation(url).href)
    .filter((url) => Boolean(getYouTubeVideoId(url)));
}

export function getYouTubeVideoId(url: string) {
  const parsed = parseUrl(url);
  if (!parsed || !YOUTUBE_HOSTS.has(parsed.hostname)) return null;

  if (parsed.hostname === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (parsed.pathname.startsWith("/shorts/")) {
    const id = parsed.pathname.split("/").filter(Boolean)[1];
    return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (parsed.pathname.startsWith("/embed/")) {
    const id = parsed.pathname.split("/").filter(Boolean)[1];
    return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  const watchId = parsed.searchParams.get("v");
  if (watchId && YOUTUBE_ID_PATTERN.test(watchId)) return watchId;

  return null;
}

export function isYouTubeShortUrl(url: string) {
  const parsed = parseUrl(url);
  return Boolean(parsed && YOUTUBE_HOSTS.has(parsed.hostname) && parsed.pathname.startsWith("/shorts/"));
}

export function buildYouTubeEmbedUrl(videoId: string) {
  const params = new URLSearchParams({
    autoplay: "1",
    controls: "1",
    loop: "1",
    mute: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    playlist: videoId,
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
