import { describe, expect, it } from "vitest";
import { buildTweetMediaProxyUrl, extractTweetMediaSourceUrl, normalizeTweetMediaUrl } from "./tweetMedia";

describe("tweet media proxy url", () => {
  it("encodes the primary fallback and poster urls", () => {
    expect(
      buildTweetMediaProxyUrl("http://127.0.0.1:4174", {
        src: "https://video.twimg.com/foo.mp4?tag=14",
        fallback: "https://d.fxtwitter.com/foo.mp4",
        poster: "https://pbs.twimg.com/foo.jpg",
      }),
    ).toBe(
      "http://127.0.0.1:4174/tweet-media?src=https%3A%2F%2Fvideo.twimg.com%2Ffoo.mp4%3Ftag%3D14&fallback=https%3A%2F%2Fd.fxtwitter.com%2Ffoo.mp4&poster=https%3A%2F%2Fpbs.twimg.com%2Ffoo.jpg",
    );
  });

  it("extracts the source url from a tweet media proxy", () => {
    expect(extractTweetMediaSourceUrl("https://localhost:5173/tweet-media?src=https%3A%2F%2Fi.4cdn.org%2Fpol%2F1778306963430935.gif")).toBe(
      "https://i.4cdn.org/pol/1778306963430935.gif",
    );
  });

  it("falls back to the original url when no proxy source exists", () => {
    expect(normalizeTweetMediaUrl("https://example.com/image.gif")).toBe("https://example.com/image.gif");
  });
});
