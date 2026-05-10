import { splitMessageText } from "./messageLinks";

const MENTION_PREFIX_PATTERN = /(^|[\s([{<"'.,!?;:])(@(?:[^\s@<>()[\]{}"'`]+(?:\s+[^\s@<>()[\]{}"'`]+)*))/g;

export type MentionToken =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string }
  | { type: "mention"; value: string; memberName: string };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMemberName(value: string) {
  return value.trim().replace(/^@+/, "").replace(/\s+/g, " ").toLowerCase();
}

function buildMentionLookup(memberNames: string[]) {
  const lookup = new Map<string, string>();
  memberNames.forEach((memberName) => {
    const trimmed = memberName.trim();
    if (!trimmed) return;
    const normalized = normalizeMemberName(trimmed);
    if (!lookup.has(normalized)) {
      lookup.set(normalized, trimmed);
    }
  });
  return lookup;
}

function buildMentionPattern(memberNames: string[]) {
  const patterns = Array.from(
    new Set(
      memberNames
        .map((memberName) => memberName.trim())
        .filter(Boolean)
        .sort((left, right) => right.length - left.length)
        .map(escapeRegExp),
    ),
  );
  if (patterns.length === 0) return null;
  return new RegExp(`(^|[\\s([{<"'.,!?;:])(@(?:${patterns.join("|")}))(?![A-Za-z0-9_])`, "g");
}

function splitMentionsInText(text: string, memberNames: string[]) {
  const lookup = buildMentionLookup(memberNames);
  const pattern = buildMentionPattern(Array.from(lookup.values()));
  if (!pattern) return [{ type: "text", value: text }] satisfies MentionToken[];

  const tokens: MentionToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const prefix = match[1] ?? "";
    const mention = match[2] ?? "";
    const memberName = lookup.get(normalizeMemberName(mention)) ?? null;
    if (!memberName) continue;

    if (start > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, start + prefix.length) });
    } else if (prefix) {
      tokens.push({ type: "text", value: prefix });
    }

    tokens.push({ type: "mention", value: mention, memberName });
    lastIndex = start + prefix.length + mention.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

export function splitTextWithMentions(text: string, memberNames: string[]) {
  const tokens: MentionToken[] = [];

  for (const token of splitMessageText(text)) {
    if (token.type === "link") {
      tokens.push(token);
      continue;
    }

    tokens.push(...splitMentionsInText(token.value, memberNames));
  }

  return tokens;
}

export function extractMentionedMemberNames(text: string, memberNames: string[]) {
  return Array.from(
    new Set(
      splitTextWithMentions(text, memberNames)
        .filter((token): token is Extract<MentionToken, { type: "mention" }> => token.type === "mention")
        .map((token) => token.memberName),
    ),
  );
}
