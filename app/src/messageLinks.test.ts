import { describe, expect, it } from "vitest";
import { extractUrls, hasOnlyLinkTokens, splitMessageText } from "./messageLinks";

describe("message link helpers", () => {
  it("splits linked text into tokens", () => {
    expect(splitMessageText("see https://example.com and then done")).toEqual([
      { type: "text", value: "see " },
      { type: "link", href: "https://example.com", label: "https://example.com" },
      { type: "text", value: " and then done" },
    ]);
  });

  it("strips punctuation from linked urls", () => {
    expect(splitMessageText("visit https://example.com.")).toEqual([
      { type: "text", value: "visit " },
      { type: "link", href: "https://example.com", label: "https://example.com" },
      { type: "text", value: "." },
    ]);
  });

  it("extracts urls from arbitrary text", () => {
    expect(extractUrls("one https://example.com/a two https://example.com/b?x=1")).toEqual([
      "https://example.com/a",
      "https://example.com/b?x=1",
    ]);
  });

  it("detects pure link messages", () => {
    expect(hasOnlyLinkTokens("https://example.com")).toBe(true);
    expect(hasOnlyLinkTokens("https://example.com.")).toBe(true);
    expect(hasOnlyLinkTokens("hello https://example.com")).toBe(false);
  });
});
