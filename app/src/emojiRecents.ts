export function updateRecentEmojis(current: string[], emoji: string, limit = 8) {
  const next = [emoji, ...current.filter((item) => item !== emoji)];
  return next.slice(0, limit);
}

