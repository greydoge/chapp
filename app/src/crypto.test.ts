import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decode,
  decryptPayload,
  deriveKey,
  deriveKeyFingerprint,
  dataUrlToBlob,
  encode,
  encryptPayload,
  formatBytes,
  reassembleAttachmentPayload,
  splitAttachmentPayload,
  type PlainWireDelete,
  type PlainWireEdit,
  type PlainWireAttachment,
  type PlainWireMessage,
  type PlainWireNote,
  type PlainWireProfileSync,
  type PlainWireMediaSync,
  type PlainWireServerSync,
  type PlainWireSessionControl,
  type PlainWireVoiceSync,
  type PlainWireTypingSync,
  type PlainWireReadSync,
} from "./crypto";

Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
});

describe("crypto payload helpers", () => {
  it("round trips byte arrays through base64", () => {
    const source = new Uint8Array([1, 2, 3, 254, 255]);

    expect(Array.from(decode(encode(source)))).toEqual(Array.from(source));
  });

  it("formats attachment sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1025)).toBe("2 KB");
    expect(formatBytes(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });

  it("converts data URLs to typed blobs", async () => {
    const blob = dataUrlToBlob("data:text/plain;base64,aGVsbG8=");

    expect(blob.type).toBe("text/plain");
    expect(blob.size).toBe(5);
    await expect(blob.text()).resolves.toBe("hello");
  });

  it("encrypts and decrypts chat messages with the same passphrase", async () => {
    const plain: PlainWireMessage = {
      type: "message",
      kind: "chat",
      id: "message-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605125,
      body: "hello 🔒",
      replyToId: "seed-1",
      replyToAuthor: "System",
      replyToBody: "prior message",
    };

    const key = await deriveKey("shared room secret");
    const encrypted = await encryptPayload(key, plain);

    expect(encrypted.ciphertext).not.toContain(plain.body);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(plain);
  });

  it("derives a stable key fingerprint from the same passphrase", async () => {
    await expect(deriveKeyFingerprint("shared room secret")).resolves.toBe(
      await deriveKeyFingerprint("shared room secret"),
    );
    await expect(deriveKeyFingerprint("shared room secret")).resolves.not.toBe(
      await deriveKeyFingerprint("different room secret"),
    );
  });

  it("encrypts and decrypts attachments with the same passphrase", async () => {
    const plain: PlainWireAttachment = {
      type: "attachment",
      id: "attachment-1",
      author: "Linus",
      channel: "engineering",
      at: 1777178605126,
      fileName: "notes.txt",
      mimeType: "text/plain",
      size: 12,
      data: "data:text/plain;base64,aGVsbG8=",
    };

    const key = await deriveKey("shared room secret");
    const encrypted = await encryptPayload(key, plain);

    expect(encrypted.ciphertext).not.toContain(plain.fileName);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(plain);
  });

  it("splits and reassembles attachment chunks", () => {
    const plain: PlainWireAttachment = {
      type: "attachment",
      id: "attachment-2",
      author: "Katherine",
      channel: "off-grid",
      at: 1777178605127,
      fileName: "report.txt",
      mimeType: "text/plain",
      size: 32,
      data: "abcdefghijklmnopqrstuvwxyz012345",
    };

    const chunks = splitAttachmentPayload(plain, 8);

    expect(chunks).toHaveLength(4);
    expect(chunks.map((chunk) => chunk.index)).toEqual([0, 1, 2, 3]);
    expect(reassembleAttachmentPayload([chunks[2], chunks[0], chunks[3], chunks[1]])).toEqual(plain);
    expect(reassembleAttachmentPayload(chunks.slice(0, 3))).toBeNull();
  });

  it("encrypts and decrypts attachment chunks", async () => {
    const attachment: PlainWireAttachment = {
      type: "attachment",
      id: "attachment-3",
      author: "Linus",
      channel: "engineering",
      at: 1777178605128,
      fileName: "chunked.txt",
      mimeType: "text/plain",
      size: 18,
      data: "chunked encrypted payload",
    };

    const [chunk] = splitAttachmentPayload(attachment, 100);
    const key = await deriveKey("chunk secret");
    const encrypted = await encryptPayload(key, chunk);

    await expect(decryptPayload(key, encrypted)).resolves.toEqual(chunk);
  });

  it("encrypts and decrypts rtc signaling payloads", async () => {
    const signal = {
      type: "rtc-signal" as const,
      id: "signal-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605129,
      description: {
        type: "offer" as const,
        sdp: "v=0\r\n",
      },
    };

    const key = await deriveKey("signal secret");
    const encrypted = await encryptPayload(key, signal);

    expect(encrypted.ciphertext).not.toContain("v=0");
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(signal);
  });

  it("encrypts and decrypts delivery receipts", async () => {
    const receipt = {
      type: "receipt" as const,
      id: "receipt-1",
      author: "Grace",
      channel: "lobby",
      at: 1777178605130,
      receivedId: "message-1",
    };

    const key = await deriveKey("receipt secret");
    const encrypted = await encryptPayload(key, receipt);

    expect(encrypted.ciphertext).not.toContain(receipt.receivedId);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(receipt);
  });

  it("encrypts and decrypts reactions", async () => {
    const reaction = {
      type: "reaction" as const,
      id: "reaction-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605131,
      messageId: "message-1",
      emoji: "🔥",
      active: true,
    };

    const key = await deriveKey("reaction secret");
    const encrypted = await encryptPayload(key, reaction);

    expect(encrypted.ciphertext).not.toContain(reaction.emoji);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(reaction);
  });

  it("encrypts and decrypts edits", async () => {
    const edit: PlainWireEdit = {
      type: "edit",
      id: "edit-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605132,
      messageId: "message-1",
      nextBody: "updated text",
    };

    const key = await deriveKey("edit secret");
    const encrypted = await encryptPayload(key, edit);

    expect(encrypted.ciphertext).not.toContain(edit.nextBody);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(edit);
  });

  it("encrypts and decrypts notes", async () => {
    const note: PlainWireNote = {
      type: "note",
      id: "note-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605132,
      subject: "Grace",
      body: "Opened Grace's local profile card.",
    };

    const key = await deriveKey("note secret");
    const encrypted = await encryptPayload(key, note);

    expect(encrypted.ciphertext).not.toContain(note.subject);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(note);
  });

  it("encrypts and decrypts deletes", async () => {
    const deletion: PlainWireDelete = {
      type: "delete",
      id: "delete-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605132,
      messageId: "message-1",
    };

    const key = await deriveKey("delete secret");
    const encrypted = await encryptPayload(key, deletion);

    expect(encrypted.ciphertext).not.toContain(deletion.messageId);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(deletion);
  });

  it("encrypts and decrypts channel sync payloads", async () => {
    const sync = {
      type: "channel-sync" as const,
      id: "channel-sync-1",
      author: "Linus",
      channel: "lobby",
      at: 1777178605132,
      action: "create" as const,
      channelId: "ops",
      label: "ops",
    };

    const key = await deriveKey("channel secret");
    const encrypted = await encryptPayload(key, sync);

    expect(encrypted.ciphertext).not.toContain(sync.channelId);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(sync);
  });

  it("encrypts and decrypts channel deletion sync payloads", async () => {
    const sync = {
      type: "channel-sync" as const,
      id: "channel-sync-2",
      author: "Grace",
      channel: "lobby",
      at: 1777178605133,
      action: "delete" as const,
      channelId: "old-room",
      label: "old-room",
      nextChannelId: "lobby",
      nextLabel: "lobby",
    };

    const key = await deriveKey("channel secret");
    const encrypted = await encryptPayload(key, sync);

    expect(encrypted.ciphertext).not.toContain(sync.nextChannelId);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(sync);
  });

  it("encrypts and decrypts server sync payloads", async () => {
    const sync: PlainWireServerSync = {
      type: "server-sync",
      id: "server-sync-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605134,
      action: "rename",
      serverName: "Relayless",
      channelId: "engineering",
      nextServerName: "Relay Hub",
      nextChannelId: "design",
    };

    const key = await deriveKey("server secret");
    const encrypted = await encryptPayload(key, sync);

    expect(encrypted.ciphertext).not.toContain(sync.nextServerName);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(sync);
  });

  it("encrypts and decrypts voice sync payloads", async () => {
    const sync: PlainWireVoiceSync = {
      type: "voice-sync",
      id: "voice-sync-1",
      author: "Grace",
      channel: "lobby",
      at: 1777178605135,
      room: "pairing",
    };

    const key = await deriveKey("voice secret");
    const encrypted = await encryptPayload(key, sync);

    expect(encrypted.ciphertext).not.toContain(sync.room);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(sync);
  });

  it("encrypts and decrypts profile sync payloads", async () => {
    const sync: PlainWireProfileSync = {
      type: "profile-sync",
      id: "profile-sync-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605136,
      name: "Ada",
      presence: "pairing in the room",
      notificationsMuted: true,
      membersOpen: false,
      activeServer: "Relayless",
      activeChannel: "design",
    };

    const key = await deriveKey("profile secret");
    const encrypted = await encryptPayload(key, sync);

    expect(encrypted.ciphertext).not.toContain(sync.presence);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(sync);
  });

  it("encrypts and decrypts session control payloads", async () => {
    const control: PlainWireSessionControl = {
      type: "session-control",
      id: "session-control-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605137,
      action: "disconnect",
    };

    const key = await deriveKey("session secret");
    const encrypted = await encryptPayload(key, control);

    expect(encrypted.ciphertext).not.toContain(control.action);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(control);
  });

  it("encrypts and decrypts media sync payloads", async () => {
    const sync: PlainWireMediaSync = {
      type: "media-sync",
      id: "media-sync-1",
      author: "Grace",
      channel: "lobby",
      at: 1777178605138,
      callActive: true,
      screenSharing: false,
      micMuted: true,
      cameraActive: false,
    };

    const key = await deriveKey("media secret");
    const encrypted = await encryptPayload(key, sync);

    expect(encrypted.ciphertext).not.toContain(sync.author);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(sync);
  });

  it("encrypts and decrypts typing sync payloads", async () => {
    const sync: PlainWireTypingSync = {
      type: "typing-sync",
      id: "typing-sync-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605139,
      typing: true,
      channelId: "lobby",
    };

    const key = await deriveKey("typing secret");
    const encrypted = await encryptPayload(key, sync);

    expect(encrypted.ciphertext).not.toContain(sync.channelId);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(sync);
  });

  it("encrypts and decrypts read sync payloads", async () => {
    const sync: PlainWireReadSync = {
      type: "read-sync",
      id: "read-sync-1",
      author: "Ada",
      channel: "lobby",
      at: 1777178605140,
      channelId: "lobby",
      readAt: 1777178606000,
    };

    const key = await deriveKey("read secret");
    const encrypted = await encryptPayload(key, sync);

    expect(encrypted.ciphertext).not.toContain(sync.channelId);
    await expect(decryptPayload(key, encrypted)).resolves.toEqual(sync);
  });

  it("rejects decrypting with a different passphrase", async () => {
    const plain: PlainWireMessage = {
      type: "message",
      kind: "chat",
      id: "message-2",
      author: "Grace",
      channel: "design",
      at: 1777178605126,
      body: "wrong key should fail",
    };

    const encrypted = await encryptPayload(await deriveKey("correct secret"), plain);

    await expect(decryptPayload(await deriveKey("wrong secret"), encrypted)).rejects.toThrow();
  });
});
