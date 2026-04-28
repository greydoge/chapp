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
