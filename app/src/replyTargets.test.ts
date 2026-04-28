import { describe, expect, it } from "vitest";
import { clearReplyTarget, getReplyTarget, moveReplyTarget, setReplyTarget } from "./replyTargets";

describe("reply target helpers", () => {
  it("stores reply targets per channel", () => {
    const targets = setReplyTarget({}, "lobby", "message-1");
    expect(getReplyTarget(targets, "lobby")).toBe("message-1");
    expect(getReplyTarget(targets, "design")).toBeNull();
  });

  it("clears a reply target for one channel", () => {
    expect(clearReplyTarget({ lobby: "message-1", design: "message-2" }, "lobby")).toEqual({
      design: "message-2",
    });
  });

  it("moves reply targets across channel renames", () => {
    expect(moveReplyTarget({ lobby: "message-1" }, "lobby", "general")).toEqual({ general: "message-1" });
  });
});
