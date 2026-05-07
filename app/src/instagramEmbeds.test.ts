import { describe, expect, it } from "vitest";
import {
  buildInstagramEmbedUrl,
  extractInstagramPreviewFromHtml,
  extractInstagramUrls,
  normalizeInstagramUrl,
} from "./instagramEmbeds";

describe("instagram embed helpers", () => {
  it("normalizes instagram post urls by stripping query params", () => {
    expect(
      normalizeInstagramUrl("https://www.instagram.com/p/DXodn6Fkg97/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ%3D%3D"),
    ).toBe("https://www.instagram.com/p/DXodn6Fkg97/");
  });

  it("normalizes instagram reels urls", () => {
    expect(normalizeInstagramUrl("https://www.instagram.com/reels/DVqjJakjwvq/")).toBe(
      "https://www.instagram.com/reel/DVqjJakjwvq/",
    );
  });

  it("extracts canonical instagram urls from text", () => {
    expect(
      extractInstagramUrls(
        "look https://www.instagram.com/p/DXodn6Fkg97/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ%3D%3D.",
      ),
    ).toEqual(["https://www.instagram.com/p/DXodn6Fkg97/"]);
  });

  it("builds an instagram embed url", () => {
    expect(buildInstagramEmbedUrl("https://www.instagram.com/p/DXodn6Fkg97/?utm_source=ig_web_copy_link")).toBe(
      "https://www.instagram.com/p/DXodn6Fkg97/embed/captioned/",
    );
  });

  it("parses media from instagram embed shell markup", () => {
    const html = `
      <div class="Embed" data-permalink="https://www.instagram.com/reel/DVqjJakjwvq/?utm_source=ig_embed&amp;utm_campaign=loading">
        <div class="HeaderText"><a class="Username" href="https://www.instagram.com/ai_greatman/"><span class="UsernameText">ai_greatman</span></a></div>
        <div class="HeaderSecondaryContent"><span>Ryota Fujimaki · Konayuki (Powder Snow)</span></div>
        <a class="EmbeddedMedia" href="https://www.instagram.com/reel/DVqjJakjwvq/?utm_source=ig_embed&amp;utm_campaign=loading">
          <img class="EmbeddedMediaImage" alt="Instagram post shared by @ai_greatman" src="https://example.com/thumb.jpg" />
        </a>
      </div>
    `;

    expect(extractInstagramPreviewFromHtml(html, "https://www.instagram.com/reel/DVqjJakjwvq/")).toMatchObject({
      url: "https://www.instagram.com/reel/DVqjJakjwvq/",
      authorName: "ai_greatman",
      handle: "ai_greatman",
      followerCountText: "Ryota Fujimaki · Konayuki (Powder Snow)",
      media: [{ type: "image", url: "https://example.com/thumb.jpg" }],
    });
  });
});
