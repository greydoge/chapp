import { describe, expect, it } from "vitest";
import { buildTweetMediaProxyUrl } from "./tweetMedia";

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
});
