export type ReplyTargets = Record<string, string>;

export function getReplyTarget(targets: ReplyTargets, channelId: string) {
  return targets[channelId] ?? null;
}

export function setReplyTarget(targets: ReplyTargets, channelId: string, messageId: string) {
  return {
    ...targets,
    [channelId]: messageId,
  };
}

export function clearReplyTarget(targets: ReplyTargets, channelId: string) {
  if (!(channelId in targets)) return targets;
  const next = { ...targets };
  delete next[channelId];
  return next;
}

export function moveReplyTarget(targets: ReplyTargets, fromChannelId: string, toChannelId: string) {
  if (fromChannelId === toChannelId) return targets;
  const target = targets[fromChannelId];
  if (target === undefined) return targets;

  const next = { ...targets };
  delete next[fromChannelId];
  next[toChannelId] = target;
  return next;
}
