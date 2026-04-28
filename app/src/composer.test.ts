import { describe, expect, it } from "vitest";
import { shouldSubmitComposerMessage } from "./composer";

describe("composer helpers", () => {
  it("submits on enter without shift", () => {
    expect(shouldSubmitComposerMessage({ key: "Enter", shiftKey: false, ctrlKey: false, metaKey: false })).toBe(true);
  });

  it("does not submit on shift enter", () => {
    expect(shouldSubmitComposerMessage({ key: "Enter", shiftKey: true, ctrlKey: false, metaKey: false })).toBe(false);
  });

  it("ignores non-enter keys", () => {
    expect(shouldSubmitComposerMessage({ key: "Escape", shiftKey: false, ctrlKey: false, metaKey: false })).toBe(false);
  });
});
