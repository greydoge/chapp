import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import {
  DEFAULT_MESSAGES,
  decryptMessagesFromStorage,
  encryptMessagesForStorage,
  isEncryptedMessageStore,
  loadPersistedMessages,
  sanitizeMessagesForStorage,
  type PersistableMessage,
} from "./storage";

Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
});

describe("storage helpers", () => {
  it("sanitizes messages before persistence", () => {
    const messages: PersistableMessage[] = [
      {
        id: "1",
        author: "Ada",
        body: "file",
        channel: "lobby",
        at: 1,
        replyToId: "0",
        replyToAuthor: "System",
        replyToBody: "context",
        pinned: true,
        edited: true,
        note: true,
        seen: true,
        attachment: {
          fileName: "secret.txt",
          mimeType: "text/plain",
          size: 5,
          dataUrl: "data:text/plain;base64,c2VjcmV0",
        },
        reactions: { "🔥": ["Ada"] },
      },
    ];

    expect(sanitizeMessagesForStorage(messages)).toEqual(messages);
  });

  it("keeps only the most recent 200 messages", () => {
    const messages = Array.from({ length: 205 }, (_, index): PersistableMessage => ({
      id: String(index),
      author: "System",
      body: String(index),
      channel: "lobby",
      at: index,
    }));

    const sanitized = sanitizeMessagesForStorage(messages);

    expect(sanitized).toHaveLength(200);
    expect(sanitized[0].id).toBe("5");
  });

  it("loads defaults for missing or invalid persisted messages", () => {
    expect(loadPersistedMessages({ getItem: () => null }, "messages")).toEqual(DEFAULT_MESSAGES);
    expect(loadPersistedMessages({ getItem: () => "not json" }, "messages")).toEqual(DEFAULT_MESSAGES);
  });

  it("encrypts and decrypts persisted messages", async () => {
    const messages: PersistableMessage[] = [
      {
        id: "encrypted-1",
        author: "Ada",
        body: "private local text",
        channel: "lobby",
        at: 10,
        replyToId: "seed-1",
        replyToAuthor: "System",
        replyToBody: "context",
        pinned: true,
        edited: true,
        note: true,
        seen: true,
        attachment: {
          fileName: "secret.txt",
          mimeType: "text/plain",
          size: 5,
          dataUrl: "data:text/plain;base64,c2VjcmV0",
        },
      },
    ];

    const envelope = await encryptMessagesForStorage("history secret", messages);

    expect(isEncryptedMessageStore(envelope)).toBe(true);
    expect(envelope.ciphertext).not.toContain("private local text");
    await expect(decryptMessagesFromStorage("history secret", envelope)).resolves.toEqual(messages);
  });

  it("rejects decrypting persisted messages with the wrong passphrase", async () => {
    const envelope = await encryptMessagesForStorage("correct", [
      {
        id: "encrypted-2",
        author: "Grace",
        body: "secret",
        channel: "lobby",
        at: 11,
        replyToId: "seed-1",
        replyToAuthor: "System",
        replyToBody: "context",
        pinned: true,
        edited: true,
        note: true,
        seen: true,
        attachment: {
          fileName: "notes.txt",
          mimeType: "text/plain",
          size: 6,
          dataUrl: "data:text/plain;base64,bm90ZXM=",
        },
      },
    ]);

    await expect(decryptMessagesFromStorage("wrong", envelope)).rejects.toThrow();
  });
});
