import { splitMessageText } from "./messageLinks";

const TWEET_URL_PATTERN =
  /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|fxtwitter\.com|fixupx\.com)\/(?:i\/web\/status\/\d+|[^/\s]+\/status\/\d+)(?:[?#].*)?/gi;
const TWEET_ID_PATTERN = /\/status\/(\d+)(?:[?#].*)?$/i;
const TWEET_HANDLE_PATTERN = /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|fxtwitter\.com|fixupx\.com)\/([^/\s]+)\/status\/\d+(?:[?#].*)?$/i;

export type TweetMedia =
  | {
      type: "image";
      url: string;
    }
  | {
      type: "video";
      url: string;
      streamUrl?: string;
      posterUrl?: string;
    };

export type TweetTextToken =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "link";
      href: string;
      label: string;
    };

export type TweetReply = {
  authorName: string;
  handle: string;
  avatarUrl?: string;
  text: string;
  url: string;
  createdAt?: string;
  media: TweetMedia[];
};

export type TweetPreview = {
  url: string;
  authorName: string;
  handle: string;
  avatarUrl?: string;
  text: string;
  createdAt?: string;
  media: TweetMedia[];
  reply?: TweetReply;
  quote?: TweetReply;
  retweet?: TweetReply;
};

const FETCH_TIMEOUT_MS = 2500;
const previewCache = new Map<string, Promise<TweetPreview | null>>();
const TWEET_MENTION_PATTERN = /(^|[\s([{<"'.,!?;:])([@#][A-Za-z0-9_]{1,30})/g;

function normalizeTwitterUrl(url: string) {
  return url.replace(/[.,!?;:]+$/, "");
}

export function rewriteTweetUrlToFxTwitter(url: string) {
  return normalizeTwitterUrl(
    url.replace(/^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|fixupx\.com)/i, "https://fxtwitter.com"),
  );
}

export function extractTweetUrls(text: string) {
  return (text.match(TWEET_URL_PATTERN) ?? []).map((url) => rewriteTweetUrlToFxTwitter(normalizeTwitterUrl(url)));
}

export function getTweetIdFromUrl(url: string) {
  return url.match(TWEET_ID_PATTERN)?.[1] ?? null;
}

export function getTweetHandleFromUrl(url: string) {
  return url.match(TWEET_HANDLE_PATTERN)?.[1] ?? null;
}

function buildEntityHref(entity: string) {
  if (entity.startsWith("@")) {
    return `https://fxtwitter.com/${entity.slice(1)}`;
  }

  return `https://fxtwitter.com/hashtag/${encodeURIComponent(entity.slice(1))}?src=hashtag_click`;
}

function splitTweetTextSegment(text: string): TweetTextToken[] {
  const tokens: TweetTextToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(TWEET_MENTION_PATTERN)) {
    const before = match.index ?? 0;
    const prefix = match[1] ?? "";
    const entity = match[2] ?? "";

    if (before > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, before + prefix.length) });
    } else if (prefix) {
      tokens.push({ type: "text", value: prefix });
    }

    tokens.push({
      type: "link",
      href: buildEntityHref(entity),
      label: entity,
    });

    lastIndex = before + prefix.length + entity.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

export function splitTweetText(text: string) {
  const tokens: TweetTextToken[] = [];

  for (const token of splitMessageText(text)) {
    if (token.type === "link") {
      tokens.push({
        type: "link",
        href: rewriteTweetUrlToFxTwitter(token.href),
        label: rewriteTweetUrlToFxTwitter(token.label),
      });
      continue;
    }

    tokens.push(...splitTweetTextSegment(token.value));
  }

  return tokens;
}

type FxVideoFormat = {
  url?: string;
  bitrate?: number;
  content_type?: string;
  container?: string;
  codec?: string;
};

type FxTweetMediaItem = {
  id?: string;
  type?: string;
  url?: string;
  thumbnail_url?: string;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  publisher?: {
    screen_name?: string;
    url?: string;
    id?: string;
    followers?: number;
    following?: number;
    likes?: number;
    media_count?: number;
    statuses?: number;
    name?: string;
    description?: string;
    raw_description?: {
      text?: string;
      facets?: unknown[];
    };
    location?: string;
    banner_url?: string;
    avatar_url?: string;
    joined?: string;
    protected?: boolean;
    website?: string | null;
    verification?: {
      verified?: boolean;
      verified_at?: string | null;
      type?: string | null;
    };
    type?: string;
  };
  formats?: FxVideoFormat[];
  variants?: FxVideoFormat[];
};

type FxTweetMediaCollection = {
  all?: FxTweetMediaItem[];
  photos?: FxTweetMediaItem[];
  videos?: FxTweetMediaItem[];
};

type FxTweet = {
  url?: string;
  id?: string;
  text?: string;
  created_at?: string;
  created_timestamp?: number;
  author?: {
    name?: string;
    screen_name?: string;
    avatar_url?: string;
  };
  replying_to?: string | null;
  replying_to_status?: string | null;
  quote?: FxTweet | null;
  media?: FxTweetMediaCollection;
  raw_text?: {
    text?: string;
    display_text_range?: [number, number];
    facets?: Array<{
      type?: string;
      indices?: [number, number];
      id?: string;
      display?: string;
      original?: string;
      replacement?: string;
    }>;
  };
};

type FxTweetApiResponse = {
  code?: number;
  message?: string;
  tweet?: FxTweet;
};

function buildDirectMediaUrl(tweetUrl: string, extension: ".mp4" | ".jpg") {
  return rewriteTweetUrlToFxTwitter(tweetUrl).replace(/[?#].*$/, "").replace(
    /^https:\/\/fxtwitter\.com\//,
    "https://d.fxtwitter.com/",
  ) + extension;
}

function getBestVideoUrl(media: FxTweetMediaItem) {
  const formats = [...(media.formats ?? []), ...(media.variants ?? [])];
  const mp4s = formats.filter((variant) => {
    const contentType = variant.content_type ?? "";
    const container = variant.container ?? "";
    return typeof variant.url === "string" && (contentType === "video/mp4" || container === "mp4" || contentType === "video/mpeg");
  });
  const preferred = mp4s.sort((left, right) => (right.bitrate ?? 0) - (left.bitrate ?? 0))[0];
  const fallback = media.url;
  const directVideoPattern = /\.(mp4|webm|mov|m4v)(?:$|[?#])/i;
  if (preferred?.url) return preferred.url;
  if (typeof fallback === "string" && directVideoPattern.test(fallback)) return fallback;
  return null;
}

function buildMedia(tweet: FxTweet, tweetUrl: string): TweetMedia[] {
  const media: TweetMedia[] = [];

  for (const item of tweet.media?.all ?? tweet.media?.videos ?? tweet.media?.photos ?? []) {
    if (item.type === "photo" && item.url) {
      media.push({ type: "image", url: item.url });
      continue;
    }

    if (item.type === "video" || item.type === "gif") {
      const videoUrl = buildDirectMediaUrl(tweetUrl, ".mp4") || getBestVideoUrl(item);
      if (videoUrl) {
        const streamUrl = getBestVideoUrl(item) ?? undefined;
        media.push({
          type: "video",
          url: videoUrl,
          streamUrl,
          posterUrl: item.thumbnail_url ?? buildDirectMediaUrl(tweetUrl, ".jpg"),
        });
      }
    }
  }

  return media;
}

function buildRelatedTweet(related: FxTweet, fallbackUrl: string) {
  const handle = related.author?.screen_name ?? "";
  if (!handle && !related.url) return null;

  return {
    authorName: related.author?.name ?? handle ?? "Unknown",
    handle,
    avatarUrl: related.author?.avatar_url,
    text: related.text ?? "",
    createdAt: related.created_at,
    media: buildMedia(related, rewriteTweetUrlToFxTwitter(related.url ?? fallbackUrl)),
    url: rewriteTweetUrlToFxTwitter(related.url ?? fallbackUrl),
  } satisfies TweetReply;
}

export function buildTweetPreviewFromFxTweet(tweet: FxTweet, fallbackUrl: string): TweetPreview | null {
  const handle = tweet.author?.screen_name ?? getTweetHandleFromUrl(fallbackUrl) ?? "";
  if (!tweet.author && !handle) return null;

  const tweetUrl = rewriteTweetUrlToFxTwitter(tweet.url ?? `https://x.com/${handle}/status/${getTweetIdFromUrl(fallbackUrl) ?? ""}`);

  return {
    url: tweetUrl,
    authorName: tweet.author?.name ?? handle,
    handle,
    avatarUrl: tweet.author?.avatar_url,
    text: tweet.text ?? "",
    createdAt: tweet.created_at,
    media: buildMedia(tweet, tweetUrl),
    quote: tweet.quote ? buildRelatedTweet(tweet.quote, tweetUrl) ?? undefined : undefined,
    reply: undefined,
    retweet: undefined,
  };
}

async function fetchJsonThroughProxy(target: string) {
  try {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(`/tweet-preview?url=${encodeURIComponent(target)}`, { signal: controller.signal });
    globalThis.clearTimeout(timeout);
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export function buildFallbackTweetPreview(url: string): TweetPreview | null {
  const tweetId = getTweetIdFromUrl(url);
  if (!tweetId) return null;

  const handle = getTweetHandleFromUrl(url) ?? "unknown";

  return {
    url: rewriteTweetUrlToFxTwitter(url),
    authorName: handle,
    handle,
    text: "",
    media: [],
  };
}

export async function fetchTweetPreview(url: string): Promise<TweetPreview | null> {
  const cached = previewCache.get(url);
  if (cached) return cached;

  const request = (async () => {
    const tweetId = getTweetIdFromUrl(url);
    if (!tweetId) return null;

    const handle = getTweetHandleFromUrl(url);
    const apiUrl = handle
      ? `https://api.fxtwitter.com/${handle}/status/${tweetId}`
      : `https://api.fxtwitter.com/status/${tweetId}`;
    const parsed = (await fetchJsonThroughProxy(apiUrl)) as FxTweetApiResponse | null;
    const tweet = parsed?.tweet;
    if (!tweet) return buildFallbackTweetPreview(url);

    return buildTweetPreviewFromFxTweet(tweet, url) ?? buildFallbackTweetPreview(url);
  })();

  previewCache.set(url, request);
  return request;
}
