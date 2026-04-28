import { describe, expect, it } from "vitest";
import { clearMessageEditDraft, getMessageEditDraft, setMessageEditDraft } from "./messageEdits";

describe("message edit draft helpers", () => {
  it("stores drafts per message", () => {
    const drafts = setMessageEditDraft({}, "message-1", "edited text");
    expect(getMessageEditDraft(drafts, "message-1")).toBe("edited text");
    expect(getMessageEditDraft(drafts, "message-2")).toBe("");
  });

  it("clears a draft for one message", () => {
    expect(clearMessageEditDraft({ "message-1": "edited text", "message-2": "other" }, "message-1")).toEqual({
      "message-2": "other",
    });
  });
});

