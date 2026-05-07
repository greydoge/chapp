const INSTAGRAM_URL_PATTERN = /https?:\/\/[^\s<>()"]+/gi;
const TRAILING_PUNCTUATION = /[.,!?;:]+$/;
const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com", "instagr.am"]);
const INSTAGRAM_PATH_PATTERN = /^\/(p|reel|reels|tv)\/([^/\s/?#]+)\/?$/i;

export type InstagramMedia =
  | {
      type: "image";
      url: string;
    }
  | {
      type: "video";
      url: string;
      posterUrl?: string;
    };

export type InstagramPreview = {
  url: string;
  authorName: string;
  handle: string;
  avatarUrl?: string;
  followerCountText?: string;
  caption?: string;
  media: InstagramMedia[];
  debugNotes?: string[];
};

function splitTrailingPunctuation(url: string) {
  const match = url.match(TRAILING_PUNCTUATION);
  const trailing = match?.[0] ?? "";
  return {
    href: trailing ? url.slice(0, -trailing.length) : url,
    trailing,
  };
}

function parseInstagramPath(pathname: string) {
  const match = pathname.match(INSTAGRAM_PATH_PATTERN);
  if (!match) return null;
  const kind = match[1].toLowerCase();
  return {
    kind: kind === "reels" ? "reel" : kind,
    shortcode: match[2],
  };
}

function parseInstagramUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!INSTAGRAM_HOSTS.has(parsed.hostname)) return null;
    const path = parseInstagramPath(parsed.pathname);
    if (!path) return null;
    return {
      ...path,
      parsed,
    };
  } catch {
    return null;
  }
}

export function normalizeInstagramUrl(url: string) {
  const parsed = parseInstagramUrl(url);
  if (!parsed) return null;
  return `https://www.instagram.com/${parsed.kind}/${parsed.shortcode}/`;
}

export function extractInstagramUrls(text: string) {
  return (text.match(INSTAGRAM_URL_PATTERN) ?? [])
    .map((url) => splitTrailingPunctuation(url).href)
    .map((url) => normalizeInstagramUrl(url))
    .filter((url): url is string => Boolean(url));
}

export function buildInstagramEmbedUrl(url: string) {
  const canonical = normalizeInstagramUrl(url);
  if (!canonical) return null;

  const parsed = new URL(canonical);
  return `https://www.instagram.com${parsed.pathname}embed/captioned/`;
}

const FETCH_TIMEOUT_MS = 2500;
const previewCache = new Map<string, Promise<InstagramPreview | null>>();

function extractQuotedJson(html: string, key: string) {
  const pattern = new RegExp(`"${key}":"((?:\\\\.|[^"\\\\])*)"`);
  const match = html.match(pattern);
  if (!match) return null;

  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return null;
  }
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

function stripTags(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function extractMetaContent(html: string, key: string) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=[\"']${key}[\"'][^>]+content=[\"']([^\"']*)[\"']`, "i");
  const match = html.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

function extractTagAttribute(html: string, tag: string, attribute: string) {
  const pattern = new RegExp(`<${tag}\\b[^>]*\\b${attribute}=[\"']([^\"']+)[\"'][^>]*>`, "i");
  const match = html.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

function extractImageSrcByClass(html: string, className: string) {
  const forwardPattern = new RegExp(`<img\\b[\\s\\S]*?\\bclass=[\"'][^\"']*\\b${className}\\b[^\"']*[\"'][\\s\\S]*?\\bsrc=[\"']([^\"']+)[\"']`, "i");
  const reversePattern = new RegExp(`<img\\b[\\s\\S]*?\\bsrc=[\"']([^\"']+)[\"'][\\s\\S]*?\\bclass=[\"'][^\"']*\\b${className}\\b[^\"']*[\"']`, "i");
  const forwardMatch = html.match(forwardPattern);
  if (forwardMatch?.[1]) return decodeHtmlEntities(forwardMatch[1]);
  const reverseMatch = html.match(reversePattern);
  return reverseMatch?.[1] ? decodeHtmlEntities(reverseMatch[1]) : null;
}

function extractLinkHrefByClass(html: string, className: string) {
  const pattern = new RegExp(`<a\\b[\\s\\S]*?\\bclass=[\"'][^\"']*\\b${className}\\b[^\"']*[\"'][\\s\\S]*?\\bhref=[\"']([^\"']+)[\"']`, "i");
  const match = html.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

function extractContextObject(html: string) {
  const quoted = extractQuotedJson(html, "contextJSON");
  if (!quoted) return null;

  try {
    const parsed = JSON.parse(quoted) as {
      context?: {
        media?: {
          __typename?: string;
          owner?: {
            username?: string;
            full_name?: string;
            profile_pic_url?: string;
          };
          display_url?: string;
          video_url?: string;
          is_video?: boolean;
          thumbnail_src?: string;
          edge_media_to_caption?: {
            edges?: Array<{ node?: { text?: string } }>;
          };
          edge_sidecar_to_children?: {
            edges?: Array<{
              node?: {
                display_url?: string;
                video_url?: string;
                is_video?: boolean;
              };
            }>;
          };
        };
      };
    };
    return parsed.context?.media ?? null;
  } catch {
    return null;
  }
}

export function buildFallbackInstagramPreview(url: string): InstagramPreview | null {
  const canonicalUrl = normalizeInstagramUrl(url);
  if (!canonicalUrl) return null;

  const parsed = new URL(canonicalUrl);
  const shortcode = parsed.pathname.split("/").filter(Boolean)[1] ?? "";
  const fallbackLabel = shortcode || "post";

  return {
    url: canonicalUrl,
    authorName: "Instagram",
    handle: "instagram",
    caption: `Instagram post ${fallbackLabel}`,
    media: [],
    debugNotes: ["fallback preview only"],
  };
}

export function extractInstagramPreviewFromHtml(html: string, url: string): InstagramPreview | null {
  const canonicalUrl = normalizeInstagramUrl(url);
  if (!canonicalUrl) return null;

  const media = extractContextObject(html);
  const debugNotes: string[] = [];
  if (media) {
    debugNotes.push("parsed contextJSON payload");
  } else {
    debugNotes.push("missing contextJSON payload");
  }
  const embedPermalink = extractTagAttribute(html, "div", "data-permalink") ?? extractTagAttribute(html, "blockquote", "data-instgrm-permalink");
  const embedUsername =
    html.match(/class="UsernameText">([^<]+)</)?.[1] ??
    html.match(/class="Username">[\s\S]*?<span[^>]*>([^<]+)</)?.[1] ??
    null;
  const embedFollowerCount =
    html.match(/class="HeaderSecondaryContent">[\s\S]*?<span>([\s\S]*?)<\/span>/)?.[1] ??
    html.match(/class="HeaderSecondaryContent">([\s\S]*?)<\/div>/)?.[1] ??
    null;
  const embedAvatar = extractImageSrcByClass(html, "Avatar") ?? null;
  const embedCaption =
    html.match(/<div class="Caption">([\s\S]*?)<div class="CaptionComments">/)?.[1] ??
    html.match(/<p[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/p>/)?.[1] ??
    null;
  const embedMediaImage =
    extractImageSrcByClass(html, "EmbeddedMediaImage") ??
    html.match(/EmbeddedMediaImage[\s\S]{0,1200}?src=[\"']([^\"']+)[\"']/i)?.[1] ??
    null;
  const embedMediaLink =
    extractLinkHrefByClass(html, "EmbeddedMedia") ??
    html.match(/data-permalink=[\"']([^\"']+)[\"']/i)?.[1] ??
    null;
  if (embedPermalink || embedUsername || embedFollowerCount || embedAvatar || embedCaption || embedMediaImage || embedMediaLink) {
    debugNotes.push("parsed embed shell");
  }
  const username =
    media?.owner?.username ??
    embedUsername ??
    html.match(/"username":"([^"]+)"/)?.[1] ??
    "";
  const authorName = media?.owner?.full_name?.trim() || username || "Instagram";
  const avatarUrl = media?.owner?.profile_pic_url ?? embedAvatar;
  const followerCountText = html.match(/class="FollowerCountText">([^<]+)</)?.[1] ?? embedFollowerCount;
  const caption =
    media?.edge_media_to_caption?.edges?.[0]?.node?.text?.trim() ||
    (embedCaption ? stripTags(embedCaption) : undefined) ||
    (embedMediaLink ? stripTags(embedMediaLink) : undefined);
  const sidecar = media?.edge_sidecar_to_children?.edges?.[0]?.node;
  const primaryImage = media?.display_url ?? sidecar?.display_url ?? media?.thumbnail_src;
  const videoUrl = media?.video_url ?? sidecar?.video_url;
  const isVideo = Boolean(media?.is_video || sidecar?.is_video || videoUrl);
  const fallbackImage = embedMediaImage ? embedMediaImage.replace(/&amp;/g, "&") : undefined;
  const ogImage = extractMetaContent(html, "og:image") ?? extractMetaContent(html, "twitter:image") ?? undefined;
  const ogVideo = extractMetaContent(html, "og:video") ?? extractMetaContent(html, "twitter:player:stream") ?? undefined;

  const resolvedMedia: InstagramMedia[] = [];
  if (isVideo && videoUrl) {
    resolvedMedia.push({
      type: "video",
      url: videoUrl,
      posterUrl: primaryImage,
    });
  } else if (primaryImage) {
    resolvedMedia.push({
      type: "image",
      url: primaryImage,
    });
  } else if (fallbackImage) {
    resolvedMedia.push({
      type: "image",
      url: fallbackImage,
    });
  } else if (ogVideo) {
    resolvedMedia.push({
      type: "video",
      url: ogVideo,
      posterUrl: ogImage,
    });
  } else if (ogImage) {
    resolvedMedia.push({
      type: "image",
      url: ogImage,
    });
  }
  if (resolvedMedia.length === 0) debugNotes.push("no image or video discovered");
  if (!caption) debugNotes.push("no caption discovered");

  return {
    url: canonicalUrl,
    authorName,
    handle: username || "instagram",
    avatarUrl: avatarUrl ?? undefined,
    followerCountText: followerCountText ?? undefined,
    caption,
    media: resolvedMedia,
    debugNotes,
  };
}

async function fetchInstagramPreviewFresh(url: string): Promise<InstagramPreview | null> {
  const canonicalUrl = normalizeInstagramUrl(url);
  if (!canonicalUrl) return null;

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`/instagram-preview?url=${encodeURIComponent(canonicalUrl)}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;

    const parsed = (await response.json()) as InstagramPreview | null;
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

export async function fetchInstagramPreview(url: string): Promise<InstagramPreview | null> {
  const canonicalUrl = normalizeInstagramUrl(url);
  if (!canonicalUrl) return null;

  const cached = previewCache.get(canonicalUrl);
  if (cached) return cached;

  const request = fetchInstagramPreviewFresh(canonicalUrl).then((result) => {
    if (result && result.media.length > 0) {
      return result;
    }
    previewCache.delete(canonicalUrl);
    return result;
  });

  previewCache.set(canonicalUrl, request);
  return request;
}

export async function fetchInstagramPreviewWithoutCache(url: string) {
  return fetchInstagramPreviewFresh(url);
}
