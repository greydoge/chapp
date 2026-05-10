import { describe, expect, it } from "vitest";
import { extractIframeEmbeds, stripIframeEmbeds } from "./iframeEmbeds";

describe("iframe embed helpers", () => {
  it("extracts linkedIn embeds from iframe markup", () => {
    const embeds = extractIframeEmbeds(
      '<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:share:7456169433774956545?collapsed=1" height="603" width="504" frameborder="0" allowfullscreen="" title="Embedded post"></iframe>',
    );

    expect(embeds).toEqual([
      {
        src: "https://www.linkedin.com/embed/feed/update/urn:li:share:7456169433774956545?collapsed=1",
        title: "Embedded post",
        width: 504,
        height: 603,
        allowFullscreen: true,
      },
    ]);
  });

  it("ignores unsupported iframe hosts", () => {
    expect(extractIframeEmbeds('<iframe src="https://example.com/embed"></iframe>')).toEqual([]);
  });

  it("strips iframe markup from text", () => {
    expect(stripIframeEmbeds('hello <iframe src="https://www.linkedin.com/embed/feed/update/urn:li:share:1"></iframe> world')).toBe(
      "hello world",
    );
  });
});
