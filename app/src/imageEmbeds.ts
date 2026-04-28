const URL_PATTERN = /https?:\/\/[^\s<>()"]+/g;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|svg)(?:[?#].*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogv|mov|m4v)(?:[?#].*)?$/i;
const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)(?:[?#].*)?$/i;

function extractUrlsByExtension(text: string, extensionPattern: RegExp) {
  return (text.match(URL_PATTERN) ?? []).filter((url) => extensionPattern.test(url));
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
  return extractUrlsByExtension(text, IMAGE_EXTENSIONS);
}

export function extractVideoUrls(text: string) {
  return extractUrlsByExtension(text, VIDEO_EXTENSIONS);
}

export function extractAudioUrls(text: string) {
  return extractUrlsByExtension(text, AUDIO_EXTENSIONS);
}
