export type WireMessage = {
  type: "message";
  id: string;
  author: string;
  channel: string;
  at: number;
  iv: string;
  ciphertext: string;
};

export type PlainWireMessage = Omit<WireMessage, "iv" | "ciphertext"> & {
  kind: "chat";
  body: string;
  replyToId?: string;
  replyToAuthor?: string;
  replyToBody?: string;
};

export type PlainWireAttachment = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "attachment";
  fileName: string;
  mimeType: string;
  size: number;
  data: string;
};

export type PlainWireAttachmentChunk = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "attachment-chunk";
  transferId: string;
  fileName: string;
  mimeType: string;
  size: number;
  index: number;
  total: number;
  data: string;
};

export type PlainWireSignal = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "rtc-signal";
  description: RTCSessionDescriptionInit;
};

export type PlainWireReceipt = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "receipt";
  receivedId: string;
};

export type PlainWireReaction = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "reaction";
  messageId: string;
  emoji: string;
  active: boolean;
};

export type PlainWireEdit = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "edit";
  messageId: string;
  nextBody: string;
};

export type PlainWireNote = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "note";
  subject: string;
  body: string;
};

export type PlainWireDelete = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "delete";
  messageId: string;
};

export type PlainWireChannelSync = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "channel-sync";
  action: "create" | "delete" | "rename";
  channelId: string;
  label: string;
  nextChannelId?: string;
  nextLabel?: string;
};

export type PlainWireServerSync = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "server-sync";
  action: "create" | "delete" | "rename";
  serverName: string;
  channelId: string;
  nextServerName?: string;
  nextChannelId?: string;
};

export type PlainWireVoiceSync = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "voice-sync";
  room: string | null;
};

export type PlainWireProfileSync = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "profile-sync";
  name: string;
  presence: string;
  notificationsMuted?: boolean;
  membersOpen?: boolean;
  activeServer?: string;
  activeChannel?: string;
};

export type PlainWireSessionControl = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "session-control";
  action: "disconnect";
};

export type PlainWireMediaSync = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "media-sync";
  callActive: boolean;
  screenSharing: boolean;
  micMuted: boolean;
};

export type PlainWireTypingSync = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "typing-sync";
  typing: boolean;
  channelId: string;
};

export type PlainWireReadSync = Omit<WireMessage, "iv" | "ciphertext" | "type"> & {
  type: "read-sync";
  channelId: string;
  readAt: number;
};

export type PlainWirePayload =
  | PlainWireMessage
  | PlainWireAttachment
  | PlainWireAttachmentChunk
  | PlainWireSignal
  | PlainWireReceipt
  | PlainWireReaction
  | PlainWireEdit
  | PlainWireNote
  | PlainWireDelete
  | PlainWireChannelSync
  | PlainWireServerSync
  | PlainWireVoiceSync
  | PlainWireProfileSync
  | PlainWireSessionControl
  | PlainWireMediaSync
  | PlainWireTypingSync
  | PlainWireReadSync;

export const ATTACHMENT_CHUNK_SIZE = 12000;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.ceil(kilobytes)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

export function splitAttachmentPayload(attachment: PlainWireAttachment, chunkSize = ATTACHMENT_CHUNK_SIZE) {
  const total = Math.max(1, Math.ceil(attachment.data.length / chunkSize));

  return Array.from({ length: total }, (_, index): PlainWireAttachmentChunk => ({
    type: "attachment-chunk",
    id: `${attachment.id}:${index}`,
    transferId: attachment.id,
    author: attachment.author,
    channel: attachment.channel,
    at: attachment.at,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    index,
    total,
    data: attachment.data.slice(index * chunkSize, (index + 1) * chunkSize),
  }));
}

export function reassembleAttachmentPayload(chunks: PlainWireAttachmentChunk[]): PlainWireAttachment | null {
  if (chunks.length === 0) return null;

  const [first] = chunks;
  if (chunks.length !== first.total) return null;

  const ordered = [...chunks].sort((left, right) => left.index - right.index);
  const valid = ordered.every(
    (chunk, index) =>
      chunk.transferId === first.transferId &&
      chunk.index === index &&
      chunk.total === first.total &&
      chunk.author === first.author &&
      chunk.channel === first.channel &&
      chunk.fileName === first.fileName,
  );

  if (!valid) return null;

  return {
    type: "attachment",
    id: first.transferId,
    author: first.author,
    channel: first.channel,
    at: first.at,
    fileName: first.fileName,
    mimeType: first.mimeType,
    size: first.size,
    data: ordered.map((chunk) => chunk.data).join(""),
  };
}

export function dataUrlToBlob(dataUrl: string) {
  const [header, payload] = dataUrl.split(",");
  const mimeType = header.match(/^data:(.*?);base64$/)?.[1] || "application/octet-stream";
  return new Blob([decode(payload ?? "")], { type: mimeType });
}

export function dataUrlToObjectUrl(dataUrl: string) {
  return URL.createObjectURL(dataUrlToBlob(dataUrl));
}

export function encode(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  return btoa(String.fromCharCode(...bytes));
}

export function decode(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export async function deriveKey(passphrase: string) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("relayless-room-v1"),
      iterations: 160000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function deriveKeyFingerprint(passphrase: string) {
  const input = new TextEncoder().encode(`relayless-room-v1:${passphrase}`);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (const byte of input) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & 0xffffffffffffffffn;
  }

  return hash.toString(16).padStart(16, "0");
}

export async function encryptPayload(key: CryptoKey, plain: PlainWirePayload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(plain)),
  );

  return {
    type: "message" as const,
    id: plain.id,
    author: plain.author,
    channel: plain.channel,
    at: plain.at,
    iv: encode(iv),
    ciphertext: encode(ciphertext),
  };
}

export async function decryptPayload(key: CryptoKey, message: WireMessage) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(message.iv) },
    key,
    decode(message.ciphertext),
  );

  return JSON.parse(new TextDecoder().decode(decrypted)) as PlainWirePayload;
}
