import { describe, expect, it } from "vitest";
import { extractTenorPreviewFromHtml, extractTenorUrls, normalizeTenorUrl } from "./tenorEmbeds";

describe("tenor embed helpers", () => {
  it("normalizes tenor urls by stripping query params", () => {
    expect(
      normalizeTenorUrl("https://tenor.com/view/pikachu-shocked-face-stunned-pokemon-shocked-not-shocked-omg-gif-24112152?utm_source=test"),
    ).toBe("https://tenor.com/view/pikachu-shocked-face-stunned-pokemon-shocked-not-shocked-omg-gif-24112152");
  });

  it("extracts tenor urls from text", () => {
    expect(
      extractTenorUrls(
        "look https://tenor.com/view/pikachu-shocked-face-stunned-pokemon-shocked-not-shocked-omg-gif-24112152?utm_source=test.",
      ),
    ).toEqual(["https://tenor.com/view/pikachu-shocked-face-stunned-pokemon-shocked-not-shocked-omg-gif-24112152"]);
  });

  it("extracts tenor tags from page keywords", () => {
    const html = `
      <html>
        <head>
          <meta name="keywords" content="gigachad,chad,gif,animated gif,gifs,meme">
          <meta name="description" content="The perfect Gigachad Chad Animated GIF for your conversation.">
        </head>
      </html>
    `;

    expect(extractTenorPreviewFromHtml(html, "https://tenor.com/view/gigachad-chad-gif-20773266")).toMatchObject({
      tags: ["gigachad", "chad", "gif", "animated gif", "gifs", "meme"],
    });
  });
});
