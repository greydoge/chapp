export function shouldSubmitComposerMessage(event: Pick<KeyboardEvent, "key" | "shiftKey" | "metaKey" | "ctrlKey">) {
  if (event.key !== "Enter") return false;
  if (event.shiftKey) return false;
  return event.ctrlKey || event.metaKey || !event.shiftKey;
}
