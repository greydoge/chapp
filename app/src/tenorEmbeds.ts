const TENOR_URL_PATTERN = /https?:\/\/[^\s<>()"]+/gi;
const TRAILING_PUNCTUATION = /[.,!?;:]+$/;
const TENOR_HOSTS = new Set(["tenor.com", "www.tenor.com", "m.tenor.com"]);

export type TenorMedia =
  | {
      type: "image";
      url: string;
    }
  | {
      type: "video";
      url: string;
      posterUrl?: string;
    };

export type TenorPreview = {
  url: string;
  authorName: string;
  handle: string;
  title?: string;
  description?: string;
  tags?: string[];
  media: TenorMedia[];
};

function splitTrailingPunctuation(url: string) {
  const match = url.match(TRAILING_PUNCTUATION);
  const trailing = match?.[0] ?? "";
  return {
    href: trailing ? url.slice(0, -trailing.length) : url,
    trailing,
  };
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)));
}

function extractMetaContent(html: string, key: string) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=[\"']${key}[\"'][^>]+content=[\"']([^\"']*)[\"']`, "i");
  const match = html.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

function extractLinkHref(html: string, rel: string) {
  const pattern = new RegExp(`<link[^>]+rel=[\"']${rel}[\"'][^>]+href=[\"']([^\"']*)[\"']`, "i");
  const match = html.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

function extractMetaKeywords(html: string) {
  const pattern = /<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']*)["']/i;
  const match = html.match(pattern);
  if (!match?.[1]) return [];

  return match[1]
    .split(",")
    .map((tag) => tag.trim())
    .map((tag) => tag.replace(/^#/, ""))
    .filter(Boolean);
}

function stripTags(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function parseTenorUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!TENOR_HOSTS.has(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function normalizeTenorUrl(url: string) {
  const parsed = parseTenorUrl(url);
  if (!parsed) return null;
  return `https://tenor.com${parsed.pathname}`.replace(/\/+$/, "");
}

export function extractTenorUrls(text: string) {
  return (text.match(TENOR_URL_PATTERN) ?? [])
    .map((url) => splitTrailingPunctuation(url).href)
    .map((url) => normalizeTenorUrl(url))
    .filter((url): url is string => Boolean(url));
}

export function buildFallbackTenorPreview(url: string): TenorPreview | null {
  const canonicalUrl = normalizeTenorUrl(url);
  if (!canonicalUrl) return null;

  return {
    url: canonicalUrl,
    authorName: "Tenor",
    handle: "tenor",
    title: "Tenor GIF",
    media: [],
  };
}

export function extractTenorPreviewFromHtml(html: string, url: string): TenorPreview | null {
  const canonicalUrl = normalizeTenorUrl(url);
  if (!canonicalUrl) return null;

  const title = extractMetaContent(html, "og:title") ?? extractMetaContent(html, "twitter:title") ?? null;
  const description =
    extractMetaContent(html, "og:description") ?? extractMetaContent(html, "twitter:description") ?? extractMetaContent(html, "description");
  const tags = Array.from(new Set(extractMetaKeywords(html)));
  const authorName =
    html.match(/"author":"([^"]+)"/)?.[1] ??
    html.match(/"creator":"([^"]+)"/)?.[1] ??
    extractMetaContent(html, "author") ??
    "Tenor";
  const posterUrl =
    extractMetaContent(html, "og:image") ??
    extractMetaContent(html, "twitter:image") ??
    extractLinkHref(html, "image_src") ??
    undefined;
  const videoUrl = extractMetaContent(html, "og:video") ?? extractMetaContent(html, "twitter:player:stream") ?? undefined;

  const media: TenorMedia[] = [];
  if (videoUrl) {
    media.push({
      type: "video",
      url: videoUrl,
      posterUrl,
    });
  } else if (posterUrl) {
    media.push({
      type: "image",
      url: posterUrl,
    });
  }

  return {
    url: canonicalUrl,
    authorName,
    handle: "tenor",
    title: title ? stripTags(title) : undefined,
    description: description ? stripTags(description) : undefined,
    tags: tags.length > 0 ? tags : undefined,
    media,
  };
}

const FETCH_TIMEOUT_MS = 2500;
const previewCache = new Map<string, Promise<TenorPreview | null>>();

async function fetchTenorPreviewFresh(url: string): Promise<TenorPreview | null> {
  const canonicalUrl = normalizeTenorUrl(url);
  if (!canonicalUrl) return null;

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`/tenor-preview?url=${encodeURIComponent(canonicalUrl)}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;

    const parsed = (await response.json()) as TenorPreview | null;
    if (!parsed) return null;

    return {
      ...parsed,
      url: canonicalUrl,
    };
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function fetchTenorPreview(url: string): Promise<TenorPreview | null> {
  const canonicalUrl = normalizeTenorUrl(url);
  if (!canonicalUrl) return null;

  const cached = previewCache.get(canonicalUrl);
  if (cached) return cached;

  const request = fetchTenorPreviewFresh(canonicalUrl).then((result) => {
    if (result && result.media.length > 0) return result;
    previewCache.delete(canonicalUrl);
    return result;
  });

  previewCache.set(canonicalUrl, request);
  return request;
}

export async function fetchTenorPreviewWithoutCache(url: string) {
  return fetchTenorPreviewFresh(url);
}
