export type TweetMediaProxyOptions = {
  src: string;
  fallback?: string;
  poster?: string;
};

export function buildTweetMediaProxyUrl(baseUrl: string, options: TweetMediaProxyOptions) {
  const url = new URL("/tweet-media", baseUrl);
  url.searchParams.set("src", options.src);
  if (options.fallback) {
    url.searchParams.set("fallback", options.fallback);
  }
  if (options.poster) {
    url.searchParams.set("poster", options.poster);
  }
  return url.toString();
}

export function extractTweetMediaSourceUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.pathname !== "/tweet-media") return null;
    const sourceUrl = parsed.searchParams.get("src") ?? parsed.searchParams.get("fallback");
    return sourceUrl?.trim() || null;
  } catch {
    return null;
  }
}

export function normalizeTweetMediaUrl(url: string) {
  return extractTweetMediaSourceUrl(url) ?? url.trim();
}
