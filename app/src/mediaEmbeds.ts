import { buildTweetMediaProxyUrl } from "./tweetMedia";

export function isLocalMediaUrl(baseUrl: string, url: string) {
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return true;
  }

  try {
    const baseOrigin = new URL(baseUrl).origin;
    return new URL(url, baseUrl).origin === baseOrigin;
  } catch {
    return false;
  }
}

export type VideoEmbedSource = {
  sourceUrl: string;
  sourceType?: string;
};

export function buildVideoEmbedSource(baseUrl: string, url: string, sourceType?: string): VideoEmbedSource {
  if (isLocalMediaUrl(baseUrl, url)) {
    return {
      sourceUrl: url,
      sourceType,
    };
  }

  return {
    sourceUrl: buildTweetMediaProxyUrl(baseUrl, { src: url }),
    sourceType: "video/webm",
  };
}
