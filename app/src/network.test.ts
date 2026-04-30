import { describe, expect, it } from "vitest";
import { DEFAULT_ICE_SERVERS, formatIceServers, migrateIceServersText, parseIceServers } from "./network";

describe("network helpers", () => {
  it("formats and parses default ICE servers", () => {
    expect(parseIceServers(formatIceServers(DEFAULT_ICE_SERVERS))).toEqual(DEFAULT_ICE_SERVERS);
  });

  it("parses TURN credentials", () => {
    const config = [
      {
        urls: ["turn:turn.example.com:3478?transport=udp", "turns:turn.example.com:5349"],
        username: "user",
        credential: "secret",
      },
    ];

    expect(parseIceServers(JSON.stringify(config))).toEqual(config);
  });

  it("rejects malformed ICE config", () => {
    expect(() => parseIceServers("{}")).toThrow("JSON array");
    expect(parseIceServers("[]")).toEqual([]);
    expect(() => parseIceServers('[{"username":"missing"}]')).toThrow("urls");
  });

  it("migrates empty ICE config to the STUN default", () => {
    expect(migrateIceServersText("[]")).toBe(formatIceServers(DEFAULT_ICE_SERVERS));
  });
});
