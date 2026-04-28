export type UnreadCounts = Record<string, number>;

export function incrementUnreadCount(current: UnreadCounts, channelId: string) {
  return {
    ...current,
    [channelId]: (current[channelId] ?? 0) + 1,
  };
}

export function clearUnreadCount(current: UnreadCounts, channelId: string) {
  if (!(channelId in current)) return current;

  const next = { ...current };
  delete next[channelId];
  return next;
}

export function moveUnreadCount(current: UnreadCounts, fromChannelId: string, toChannelId: string) {
  if (fromChannelId === toChannelId) return current;
  const count = current[fromChannelId];
  if (!count) return current;

  const next = { ...current };
  delete next[fromChannelId];
  next[toChannelId] = (next[toChannelId] ?? 0) + count;
  return next;
}

export function clearAllUnreadCounts() {
  return {};
}

export function getUnreadCountForChannel(current: UnreadCounts, channelId?: string | null) {
  if (!channelId) return 0;
  return current[channelId] ?? 0;
}

export function getUnreadCountForChannels(current: UnreadCounts, channelIds: string[]) {
  return channelIds.reduce((total, channelId) => total + (current[channelId] ?? 0), 0);
}
