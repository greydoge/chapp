import { describe, expect, it } from "vitest";
import { buildVideoEmbedSource } from "./mediaEmbeds";

describe("media embeds", () => {
  it("proxies remote video urls", () => {
    expect(buildVideoEmbedSource("http://127.0.0.1:4174", "https://example.com/video.mp4")).toEqual({
      sourceUrl: "http://127.0.0.1:4174/tweet-media?src=https%3A%2F%2Fexample.com%2Fvideo.mp4",
      sourceType: "video/webm",
    });
  });

  it("keeps blob urls local", () => {
    expect(buildVideoEmbedSource("http://127.0.0.1:4174", "blob:http://127.0.0.1:4174/abc")).toEqual({
      sourceUrl: "blob:http://127.0.0.1:4174/abc",
      sourceType: undefined,
    });
  });

  it("keeps data urls local", () => {
    expect(buildVideoEmbedSource("http://127.0.0.1:4174", "data:video/mp4;base64,AAAA")).toEqual({
      sourceUrl: "data:video/mp4;base64,AAAA",
      sourceType: undefined,
    });
  });

  it("keeps same-origin urls local", () => {
    expect(buildVideoEmbedSource("http://127.0.0.1:4174", "http://127.0.0.1:4174/uploads/video.webm")).toEqual({
      sourceUrl: "http://127.0.0.1:4174/uploads/video.webm",
      sourceType: undefined,
    });
  });

  it("keeps same-origin mime hints local", () => {
    expect(buildVideoEmbedSource("http://127.0.0.1:4174", "http://127.0.0.1:4174/uploads/video.webm", "video/webm")).toEqual({
      sourceUrl: "http://127.0.0.1:4174/uploads/video.webm",
      sourceType: "video/webm",
    });
  });
});
