export type ChannelDrafts = Record<string, string>;

export function getChannelDraft(drafts: ChannelDrafts, channelId: string) {
  return drafts[channelId] ?? "";
}

export function setChannelDraft(drafts: ChannelDrafts, channelId: string, value: string) {
  return {
    ...drafts,
    [channelId]: value,
  };
}

export function clearChannelDraft(drafts: ChannelDrafts, channelId: string) {
  if (!(channelId in drafts)) return drafts;
  const next = { ...drafts };
  delete next[channelId];
  return next;
}

export function moveChannelDraft(drafts: ChannelDrafts, fromChannelId: string, toChannelId: string) {
  if (fromChannelId === toChannelId) return drafts;
  const draft = drafts[fromChannelId];
  if (draft === undefined) return drafts;

  const next = { ...drafts };
  delete next[fromChannelId];
  next[toChannelId] = draft;
  return next;
}
