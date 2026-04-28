export type MessageEditDrafts = Record<string, string>;

export function getMessageEditDraft(drafts: MessageEditDrafts, messageId: string) {
  return drafts[messageId] ?? "";
}

export function setMessageEditDraft(drafts: MessageEditDrafts, messageId: string, value: string) {
  return {
    ...drafts,
    [messageId]: value,
  };
}

export function clearMessageEditDraft(drafts: MessageEditDrafts, messageId: string) {
  if (!(messageId in drafts)) return drafts;
  const next = { ...drafts };
  delete next[messageId];
  return next;
}

