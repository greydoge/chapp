const URL_PATTERN = /https?:\/\/[^\s<>()"]+/g;
const TRAILING_PUNCTUATION = /[.,!?;:]+$/;
const TRIVIAL_TEXT = /^[\s.,!?;:]+$/;

export type MessageLinkToken =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string };

function splitTrailingPunctuation(url: string) {
  const match = url.match(TRAILING_PUNCTUATION);
  const trailing = match?.[0] ?? "";
  return {
    href: trailing ? url.slice(0, -trailing.length) : url,
    trailing,
  };
}

export function splitMessageText(text: string): MessageLinkToken[] {
  const tokens: MessageLinkToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    const { href, trailing } = splitTrailingPunctuation(url);
    tokens.push({ type: "link", href, label: href });
    if (trailing) {
      tokens.push({ type: "text", value: trailing });
    }

    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

export function extractUrls(text: string) {
  return splitMessageText(text)
    .filter((token): token is Extract<MessageLinkToken, { type: "link" }> => token.type === "link")
    .map((token) => token.href);
}

export function hasOnlyLinkTokens(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const tokens = splitMessageText(text).filter((token) => !(token.type === "text" && TRIVIAL_TEXT.test(token.value)));
  return tokens.length > 0 && tokens.every((token) => token.type === "link");
}
