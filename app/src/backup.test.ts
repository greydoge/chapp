import { describe, expect, it } from "vitest";
import { createWorkspaceBackup, parseWorkspaceBackup, type WorkspaceBackupSettings } from "./backup";
import { type PersistableMessage } from "./storage";

describe("workspace backup helpers", () => {
  it("round-trips a backup envelope", () => {
    const settings: WorkspaceBackupSettings = {
      activeServer: "Relayless",
      activeChannelsByServer: { Relayless: "lobby" },
      activeVoiceRoom: "pairing",
      channels: [{ id: "lobby", label: "lobby" }],
      draftByChannel: { lobby: "hello" },
      editDraftByMessage: { "message-1": "edited" },
      gifFavorites: ["bounce"],
      replyTargetByChannel: { lobby: "message-1" },
      unreadByChannel: { lobby: 2 },
      recentEmojis: ["👍"],
      signalInput: "offer",
      signalOutput: "answer",
    };
    const messages: PersistableMessage[] = [
      {
        id: "message-1",
        author: "Ada",
        body: "hello",
        channel: "lobby",
        at: 1,
        edited: true,
        seen: true,
        attachment: {
          fileName: "notes.txt",
          mimeType: "text/plain",
          size: 12,
          dataUrl: "data:text/plain;base64,bm90ZXM=",
        },
      },
    ];

    const backup = createWorkspaceBackup(settings, messages);
    const parsed = parseWorkspaceBackup(backup);

    expect(parsed).toEqual({
      version: 1,
      settings,
      messages,
    });
  });

  it("rejects malformed backup payloads", () => {
    expect(parseWorkspaceBackup("not json")).toBeNull();
    expect(parseWorkspaceBackup(JSON.stringify({ version: 2, settings: {}, messages: [] }))).toBeNull();
    expect(parseWorkspaceBackup(JSON.stringify({ version: 1, settings: null, messages: [] }))).toBeNull();
    expect(parseWorkspaceBackup(JSON.stringify({ version: 1, settings: {}, messages: "nope" }))).toBeNull();
  });

  it("drops malformed messages during import", () => {
    const parsed = parseWorkspaceBackup(
      JSON.stringify({
        version: 1,
        settings: {},
        messages: [
          {
            id: "message-1",
            author: "Grace",
            body: "valid",
            channel: "lobby",
            at: 1,
            attachment: {
              fileName: "notes.txt",
              mimeType: "text/plain",
              size: 12,
            },
          },
          {
            id: 2,
            author: "Bad",
            body: "skip me",
            channel: "lobby",
            at: 2,
          },
        ],
      }),
    );

    expect(parsed?.messages).toHaveLength(1);
    expect(parsed?.messages[0]).toMatchObject({
      id: "message-1",
      author: "Grace",
      body: "valid",
      channel: "lobby",
      at: 1,
      attachment: {
        fileName: "notes.txt",
        mimeType: "text/plain",
        size: 12,
      },
    });
  });
});
