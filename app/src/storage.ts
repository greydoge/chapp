import { decode, encode } from "./crypto";

export type PersistableAttachment = {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl?: string;
};

export type PersistableMessage = {
  id: string;
  author: string;
  body: string;
  channel: string;
  at: number;
  note?: boolean;
  replyToId?: string;
  replyToAuthor?: string;
  replyToBody?: string;
  attachment?: PersistableAttachment;
  delivered?: boolean;
  encrypted?: boolean;
  edited?: boolean;
  local?: boolean;
  pinned?: boolean;
  seen?: boolean;
  reactions?: Record<string, string[]>;
};

export type EncryptedMessageStore = {
  ciphertext: string;
  iv: string;
  version: 1;
};

export const DEFAULT_MESSAGES: PersistableMessage[] = [
  {
    id: "seed-1",
    author: "System",
    body: "No account, no central message store. Create an invite, share it out-of-band, and peers connect directly.",
    channel: "lobby",
    at: Date.now() - 1000 * 60 * 14,
    encrypted: true,
  },
  {
    id: "seed-2",
    author: "System",
    body: "Room traffic is encrypted with AES-GCM before it touches WebRTC. The passphrase never leaves this browser.",
    channel: "off-grid",
    at: Date.now() - 1000 * 60 * 8,
    encrypted: true,
  },
];

export function sanitizeMessagesForStorage(messages: PersistableMessage[]) {
  return messages.slice(-200).map((message) => ({
    id: message.id,
    author: message.author,
    body: message.body,
    channel: message.channel,
    at: message.at,
    note: message.note,
    replyToId: message.replyToId,
    replyToAuthor: message.replyToAuthor,
    replyToBody: message.replyToBody,
    attachment: message.attachment
      ? {
          fileName: message.attachment.fileName,
          mimeType: message.attachment.mimeType,
          size: message.attachment.size,
          dataUrl: message.attachment.dataUrl,
        }
      : undefined,
    delivered: message.delivered,
    encrypted: message.encrypted,
    edited: message.edited,
    local: message.local,
    pinned: message.pinned,
    seen: message.seen,
    reactions: message.reactions,
  }));
}

export function loadPersistedMessages(storage: Pick<Storage, "getItem">, key: string) {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "null") as PersistableMessage[] | null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MESSAGES;
  } catch {
    return DEFAULT_MESSAGES;
  }
}

async function deriveStorageKey(passphrase: string) {
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
      salt: new TextEncoder().encode("relayless-history-v1"),
      iterations: 160000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function isEncryptedMessageStore(value: unknown): value is EncryptedMessageStore {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as Partial<EncryptedMessageStore>).version === 1 &&
    typeof (value as Partial<EncryptedMessageStore>).iv === "string" &&
    typeof (value as Partial<EncryptedMessageStore>).ciphertext === "string"
  );
}

export async function encryptMessagesForStorage(passphrase: string, messages: PersistableMessage[]) {
  const key = await deriveStorageKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(sanitizeMessagesForStorage(messages))),
  );

  return {
    ciphertext: encode(ciphertext),
    iv: encode(iv),
    version: 1 as const,
  };
}

export async function decryptMessagesFromStorage(passphrase: string, envelope: EncryptedMessageStore) {
  const key = await deriveStorageKey(passphrase);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(envelope.iv) },
    key,
    decode(envelope.ciphertext),
  );
  const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as PersistableMessage[];

  return Array.isArray(parsed) && parsed.length > 0 ? sanitizeMessagesForStorage(parsed) : DEFAULT_MESSAGES;
}
