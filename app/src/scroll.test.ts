import { describe, expect, it } from "vitest";
import { isNearBottom } from "./scroll";

describe("scroll helpers", () => {
  it("detects when the list is close enough to the bottom to follow new messages", () => {
    expect(isNearBottom(860, 120, 1000)).toBe(true);
    expect(isNearBottom(780, 120, 1000)).toBe(false);
  });
});

