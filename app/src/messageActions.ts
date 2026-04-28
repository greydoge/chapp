export const DEFAULT_QUICK_REACTIONS = ["👍", "🔥", "😂"];

export function getQuickReactionOptions(reactions?: Record<string, string[]>) {
  return DEFAULT_QUICK_REACTIONS.filter((emoji) => !(reactions?.[emoji]?.length ?? 0));
}

export function hasAnyReactions(reactions?: Record<string, string[]>) {
  return Boolean(reactions && Object.keys(reactions).length > 0);
}
