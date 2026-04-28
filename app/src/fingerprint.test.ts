import { describe, expect, it } from "vitest";
import { formatFingerprint, normalizeFingerprint } from "./fingerprint";

describe("fingerprint helpers", () => {
  it("formats digests into readable groups", () => {
    expect(formatFingerprint(Uint8Array.from({ length: 16 }, (_, index) => index))).toBe(
      "0001-0203-0405-0607-0809-0a0b-0c0d-0e0f",
    );
  });

  it("normalizes pasted fingerprint text", () => {
    expect(normalizeFingerprint("00-11 22:33")).toBe("00112233");
  });
});

