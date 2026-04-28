import { describe, expect, it } from "vitest";
import { deleteServerEntries, renameServerEntries } from "./serverState";

describe("serverState", () => {
  it("renames a server entry and keeps the remembered channel for the renamed server", () => {
    const result = renameServerEntries(
      ["Relayless", "Peer Lab"],
      { Relayless: "lobby", "Peer Lab": "design" },
      "Relayless",
      "Relay Hub",
      "engineering",
    );

    expect(result.servers).toEqual(["Relay Hub", "Peer Lab"]);
    expect(result.activeChannelsByServer).toEqual({
      "Relay Hub": "engineering",
      "Peer Lab": "design",
    });
  });

  it("removes a server entry and promotes a fallback server channel", () => {
    const result = deleteServerEntries(
      ["Relayless", "Peer Lab", "E2E Ops"],
      { Relayless: "lobby", "Peer Lab": "design", "E2E Ops": "off-grid" },
      "Peer Lab",
      "E2E Ops",
      "engineering",
    );

    expect(result.servers).toEqual(["Relayless", "E2E Ops"]);
    expect(result.activeChannelsByServer).toEqual({
      Relayless: "lobby",
      "E2E Ops": "engineering",
    });
  });
});
