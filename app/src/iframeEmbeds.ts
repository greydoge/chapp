const IFRAME_TAG_PATTERN = /<iframe\b[\s\S]*?<\/iframe>/gi;
const ATTRIBUTE_PATTERN = /\b([a-zA-Z][\w:-]*)=(["'])(.*?)\2/g;
const LINKEDIN_HOSTS = new Set(["linkedin.com", "www.linkedin.com"]);
const LINKEDIN_PATH_PATTERN = /^\/embed\/feed\/update\/urn:li:share:[^/?#]+\/?$/i;

export type IframeEmbed = {
  src: string;
  title: string;
  width?: number;
  height?: number;
  allowFullscreen: boolean;
};

function parseAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(ATTRIBUTE_PATTERN)) {
    const key = match[1].toLowerCase();
    const value = match[3].replace(/&amp;/g, "&");
    attributes[key] = value;
  }
  return attributes;
}

function normalizeLinkedInEmbedUrl(src: string) {
  try {
    const parsed = new URL(src);
    if (!LINKEDIN_HOSTS.has(parsed.hostname)) return null;
    if (!LINKEDIN_PATH_PATTERN.test(parsed.pathname)) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractIframeEmbeds(text: string): IframeEmbed[] {
  const embeds: IframeEmbed[] = [];

  for (const match of text.matchAll(IFRAME_TAG_PATTERN)) {
    const tag = match[0];
    const attributes = parseAttributes(tag);
    const normalizedSrc = attributes.src ? normalizeLinkedInEmbedUrl(attributes.src) : null;
    if (!normalizedSrc) continue;

    const width = Number.parseInt(attributes.width ?? "", 10);
    const height = Number.parseInt(attributes.height ?? "", 10);
    const allowFullscreen = "allowfullscreen" in attributes || attributes.allowfullscreen === "";

    embeds.push({
      src: normalizedSrc,
      title: attributes.title?.trim() || "Embedded content",
      width: Number.isFinite(width) && width > 0 ? width : undefined,
      height: Number.isFinite(height) && height > 0 ? height : undefined,
      allowFullscreen,
    });
  }

  return embeds;
}

export function stripIframeEmbeds(text: string) {
  return text.replace(IFRAME_TAG_PATTERN, " ").replace(/\s{2,}/g, " ");
}
