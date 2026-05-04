import { type ChannelDrafts } from "./channelDrafts";
import { type MessageEditDrafts } from "./messageEdits";
import { type ReplyTargets } from "./replyTargets";
import { sanitizeMessagesForStorage, type PersistableMessage } from "./storage";
import { type UnreadCounts } from "./unread";

export type WorkspaceBackupSettings = {
  activeServer?: string;
  activeChannelsByServer?: Record<string, string>;
  serverSubtitles?: Record<string, string>;
  activeVoiceRoom?: string | null;
  channels?: { id: string; label: string }[];
  channelChildren?: Record<string, string[]>;
  voiceRooms?: string[];
  xmppWebSocketUrl?: string;
  xmppJid?: string;
  xmppPassword?: string;
  xmppRoomJid?: string;
  xmppSpaceServiceJid?: string;
  xmppSpaceNode?: string;
  xmppNick?: string;
  iceServersText?: string;
  membersOpen?: boolean;
  notificationsMuted?: boolean;
  name?: string;
  presence?: string;
  about?: string;
  pronouns?: string;
  pronunciation?: string;
  hobbies?: string;
  languages?: string;
  accentColor?: string;
  appTheme?: string;
  statusMessage?: string;
  website?: string;
  location?: string;
  headline?: string;
  timezone?: string;
  birthday?: string;
  company?: string;
  school?: string;
  major?: string;
  avatarUrl?: string;
  avatarFrameUrl?: string;
  bannerUrl?: string;
  avatarAnimated?: boolean;
  chatPaneMode?: "single" | "split";
  chatPaneChannels?: string[];
  chatPaneDrafts?: string[];
  chatPaneReplyTargets?: Array<string | null>;
  chatPaneCompactSections?: boolean[];
  gifFavorites?: string[];
  events?: string[];
  recentEmojis?: string[];
  newChannelName?: string;
  newServerName?: string;
  newServerSubtitle?: string;
  draftByChannel?: ChannelDrafts;
  editDraftByMessage?: MessageEditDrafts;
  replyTargetByChannel?: ReplyTargets;
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
