import { describe, expect, it } from "vitest";
import {
  clearAllUnreadCounts,
  clearUnreadCount,
  getUnreadCountForChannel,
  getUnreadCountForChannels,
  incrementUnreadCount,
  moveUnreadCount,
} from "./unread";

describe("unread helpers", () => {
  it("increments and clears per-channel unread counts", () => {
    const once = incrementUnreadCount({}, "lobby");
    expect(once).toEqual({ lobby: 1 });
    expect(incrementUnreadCount(once, "lobby")).toEqual({ lobby: 2 });
    expect(clearUnreadCount(once, "lobby")).toEqual({});
  });

  it("moves unread counts across channel remaps", () => {
    expect(moveUnreadCount({ lobby: 2, design: 1 }, "lobby", "support")).toEqual({
      design: 1,
      support: 2,
    });
  });

  it("clears all unread counts", () => {
    expect(clearAllUnreadCounts()).toEqual({});
  });

  it("reads the unread count for a channel", () => {
    expect(getUnreadCountForChannel({ lobby: 3 }, "lobby")).toBe(3);
    expect(getUnreadCountForChannel({ lobby: 3 }, "design")).toBe(0);
    expect(getUnreadCountForChannel({ lobby: 3 }, null)).toBe(0);
  });

  it("sums unread counts for multiple channels", () => {
    expect(getUnreadCountForChannels({ lobby: 3, design: 2, offGrid: 1 }, ["lobby", "design"])).toBe(5);
  });
});
