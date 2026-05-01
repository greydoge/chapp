const URL_PATTERN = /https?:\/\/[^\s<>()"]+/g;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|svg)(?:[?#].*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogv|mov|m4v)(?:[?#].*)?$/i;
const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)(?:[?#].*)?$/i;
const IMAGE_FORMATS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);

function extractUrlsByExtension(text: string, extensionPattern: RegExp) {
  return (text.match(URL_PATTERN) ?? []).filter((url) => extensionPattern.test(url));
}

function isTwitterImageCdnUrl(url: string) {
  try {
    const parsed = new URL(url);
    const format = parsed.searchParams.get("format")?.toLowerCase();
    return parsed.hostname === "pbs.twimg.com" && parsed.pathname.startsWith("/media/") && Boolean(format && IMAGE_FORMATS.has(format));
  } catch {
    return false;
  }
}

export function isImageMimeType(mimeType?: string) {
  return Boolean(mimeType && mimeType.startsWith("image/"));
}

export function isVideoMimeType(mimeType?: string) {
  return Boolean(mimeType && mimeType.startsWith("video/"));
}

export function isAudioMimeType(mimeType?: string) {
  return Boolean(mimeType && mimeType.startsWith("audio/"));
}

export function extractImageUrls(text: string) {
  return (text.match(URL_PATTERN) ?? []).filter((url) => IMAGE_EXTENSIONS.test(url) || isTwitterImageCdnUrl(url));
}

export function extractVideoUrls(text: string) {
  return extractUrlsByExtension(text, VIDEO_EXTENSIONS);
}

export function extractAudioUrls(text: string) {
  return extractUrlsByExtension(text, AUDIO_EXTENSIONS);
}
