import { describe, expect, it } from "vitest";
import { getQuickReactionOptions, hasAnyReactions } from "./messageActions";

describe("message action helpers", () => {
  it("filters quick reactions that already exist", () => {
    expect(getQuickReactionOptions({ "👍": ["Ada"], "🔥": ["Grace"] })).toEqual(["😂"]);
  });

  it("detects whether a message has reactions", () => {
    expect(hasAnyReactions()).toBe(false);
    expect(hasAnyReactions({ "👍": ["Ada"] })).toBe(true);
  });
});
