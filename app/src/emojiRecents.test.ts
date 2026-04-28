import { describe, expect, it } from "vitest";
import { updateRecentEmojis } from "./emojiRecents";

describe("emoji recents helper", () => {
  it("keeps the newest emoji first and removes duplicates", () => {
    expect(updateRecentEmojis(["👍", "🔥", "😂"], "🔥")).toEqual(["🔥", "👍", "😂"]);
  });

  it("caps the recent list to the configured limit", () => {
    const recents = Array.from({ length: 8 }, (_, index) => String(index));
    expect(updateRecentEmojis(recents, "x")).toHaveLength(8);
    expect(updateRecentEmojis(recents, "x")[0]).toBe("x");
  });
});

