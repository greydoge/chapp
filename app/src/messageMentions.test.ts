import { describe, expect, it } from "vitest";
import { extractMentionedMemberNames, splitTextWithMentions } from "./messageMentions";

describe("message mentions", () => {
  it("splits known mentions into mention tokens", () => {
    expect(splitTextWithMentions("hi @Ada and @Linus", ["Ada", "Linus", "Grace"])).toEqual([
      { type: "text", value: "hi " },
      { type: "mention", value: "@Ada", memberName: "Ada" },
      { type: "text", value: " and " },
      { type: "mention", value: "@Linus", memberName: "Linus" },
    ]);
  });

  it("keeps unknown handles as plain text", () => {
    expect(splitTextWithMentions("hello @someone", ["Ada"])).toEqual([{ type: "text", value: "hello @someone" }]);
  });

  it("keeps mentions separate from urls", () => {
    expect(splitTextWithMentions("see https://example.com/@Ada and ping @Ada", ["Ada"])).toEqual([
      { type: "text", value: "see " },
      { type: "link", href: "https://example.com/@Ada", label: "https://example.com/@Ada" },
      { type: "text", value: " and ping " },
      { type: "mention", value: "@Ada", memberName: "Ada" },
    ]);
  });

  it("extracts mentioned member names once", () => {
    expect(extractMentionedMemberNames("@Ada hi @Ada and @Grace", ["Ada", "Grace"])).toEqual(["Ada", "Grace"]);
  });
});
