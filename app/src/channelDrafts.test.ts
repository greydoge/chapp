import { describe, expect, it } from "vitest";
import { clearChannelDraft, getChannelDraft, moveChannelDraft, setChannelDraft } from "./channelDrafts";

describe("channel draft helpers", () => {
  it("gets and sets per-channel drafts", () => {
    const drafts = setChannelDraft({}, "lobby", "hello");
    expect(getChannelDraft(drafts, "lobby")).toBe("hello");
    expect(getChannelDraft(drafts, "design")).toBe("");
  });

  it("clears drafts for a single channel", () => {
    expect(clearChannelDraft({ lobby: "hello", design: "work" }, "lobby")).toEqual({ design: "work" });
  });

  it("moves drafts across channel renames", () => {
    expect(moveChannelDraft({ lobby: "hello" }, "lobby", "general")).toEqual({ general: "hello" });
  });
});
