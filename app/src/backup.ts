import { type ChannelDrafts } from "./channelDrafts";
import { type MessageEditDrafts } from "./messageEdits";
import { type ReplyTargets } from "./replyTargets";
import { sanitizeMessagesForStorage, type PersistableMessage } from "./storage";
import { type UnreadCounts } from "./unread";

export type WorkspaceBackupSettings = {
  activeServer?: string;
  activeChannelsByServer?: Record<string, string>;
  activeVoiceRoom?: string | null;
  channels?: { id: string; label: string }[];
  iceServersText?: string;
  membersOpen?: boolean;
  notificationsMuted?: boolean;
  name?: string;
  presence?: string;
  gifFavorites?: string[];
  recentEmojis?: string[];
  newChannelName?: string;
  newServerName?: string;
  draftByChannel?: ChannelDrafts;
  editDraftByMessage?: MessageEditDrafts;
  replyTargetByChannel?: ReplyTargets;
  signalInput?: string;
  signalOutput?: string;
  searchQuery?: string;
  searchIndex?: number;
  roomPeerFingerprint?: string;
  servers?: string[];
  unreadByChannel?: UnreadCounts;
};

export type WorkspaceBackup = {
  version: 1;
  settings: WorkspaceBackupSettings;
  messages: PersistableMessage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPersistableMessage(value: unknown): value is PersistableMessage {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string") return false;
  if (typeof value.author !== "string") return false;
  if (typeof value.body !== "string") return false;
  if (typeof value.channel !== "string") return false;
  if (typeof value.at !== "number") return false;
  if (value.attachment && isRecord(value.attachment)) {
    if (typeof value.attachment.fileName !== "string") return false;
    if (typeof value.attachment.mimeType !== "string") return false;
    if (typeof value.attachment.size !== "number") return false;
    if (value.attachment.dataUrl !== undefined && typeof value.attachment.dataUrl !== "string") return false;
  }
  return true;
}

export function createWorkspaceBackup(settings: WorkspaceBackupSettings, messages: PersistableMessage[]) {
  return JSON.stringify({
    version: 1 as const,
    settings,
    messages: sanitizeMessagesForStorage(messages),
  });
}

export function parseWorkspaceBackup(raw: string): WorkspaceBackup | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== 1) return null;
    if (!isRecord(parsed.settings) || !Array.isArray(parsed.messages)) return null;

    const messages = parsed.messages.filter(isPersistableMessage);

    return {
      version: 1,
      settings: parsed.settings as WorkspaceBackupSettings,
      messages: sanitizeMessagesForStorage(messages),
    };
  } catch {
    return null;
  }
}
