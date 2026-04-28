import { describe, expect, it } from "vitest";
import { shouldNotifyIncomingMessage } from "./notifications";

describe("notification helpers", () => {
  it("only notifies for peer messages when the tab is hidden or the channel is inactive", () => {
    expect(
      shouldNotifyIncomingMessage({
        activeChannel: "lobby",
        author: "Ada",
        channel: "lobby",
        notificationsMuted: false,
        selfName: "You",
        visibilityState: "visible",
      }),
    ).toBe(false);

    expect(
      shouldNotifyIncomingMessage({
        activeChannel: "lobby",
        author: "Ada",
        channel: "design",
        notificationsMuted: false,
        selfName: "You",
        visibilityState: "visible",
      }),
    ).toBe(true);

    expect(
      shouldNotifyIncomingMessage({
        activeChannel: "lobby",
        author: "Ada",
        channel: "lobby",
        notificationsMuted: false,
        selfName: "You",
        visibilityState: "hidden",
      }),
    ).toBe(true);
  });

  it("respects mute state and ignores self-authored messages", () => {
    expect(
      shouldNotifyIncomingMessage({
        activeChannel: "lobby",
        author: "You",
        channel: "design",
        notificationsMuted: false,
        selfName: "You",
        visibilityState: "hidden",
      }),
    ).toBe(false);

    expect(
      shouldNotifyIncomingMessage({
        activeChannel: "lobby",
        author: "Ada",
        channel: "design",
        notificationsMuted: true,
        selfName: "You",
        visibilityState: "hidden",
      }),
    ).toBe(false);
  });
});

