import { describe, expect, it } from "vitest";
import {
  buildFallbackTweetPreview,
  buildTweetPreviewFromFxTweet,
  extractTweetUrls,
  getTweetHandleFromUrl,
  getTweetIdFromUrl,
  splitTweetText,
} from "./tweetEmbeds";

describe("tweet embed helpers", () => {
  it("extracts x and twitter tweet urls", () => {
    expect(extractTweetUrls("look https://x.com/foo/status/1234567890123456789 and https://twitter.com/bar/status/9876543210987654321?s=20")).toEqual([
      "https://fxtwitter.com/foo/status/1234567890123456789",
      "https://fxtwitter.com/bar/status/9876543210987654321?s=20",
    ]);
  });

  it("extracts tweet ids and handles", () => {
    expect(getTweetIdFromUrl("https://x.com/XH_Lee23/status/2048395105837744202?s=20")).toBe("2048395105837744202");
    expect(getTweetHandleFromUrl("https://x.com/XH_Lee23/status/2048395105837744202?s=20")).toBe("XH_Lee23");
  });

  it("builds a fallback tweet preview from the url", () => {
    expect(buildFallbackTweetPreview("https://x.com/XH_Lee23/status/2048395105837744202?s=20")).toEqual({
      url: "https://fxtwitter.com/XH_Lee23/status/2048395105837744202?s=20",
      authorName: "XH_Lee23",
      handle: "XH_Lee23",
      text: "",
      media: [],
    });
  });

  it("does not build fallback previews for non tweet urls", () => {
    expect(buildFallbackTweetPreview("https://example.com")).toBeNull();
  });

  it("maps fxtwitter api tweet data into a preview", () => {
    expect(
      buildTweetPreviewFromFxTweet(
        {
          url: "https://x.com/user/status/123",
          text: "hello world",
          created_at: "Tue Apr 27 00:00:00 +0000 2026",
          author: {
            name: "Display Name",
            screen_name: "user",
            avatar_url: "https://example.com/avatar.jpg",
          },
          media: {
            all: [
              {
                type: "photo",
                url: "https://example.com/photo.jpg",
              },
              {
                type: "video",
                url: "https://example.com/video.mp4",
                thumbnail_url: "https://example.com/thumb.jpg",
                formats: [
                  { url: "https://example.com/video-720.mp4", bitrate: 720000, content_type: "video/mp4" },
                  { url: "https://example.com/video.m3u8", content_type: "application/x-mpegURL" },
                ],
              },
            ],
          },
          quote: {
            url: "https://x.com/other/status/456",
            text: "quoted",
            created_at: "Tue Apr 27 00:05:00 +0000 2026",
            author: {
              name: "Quoted User",
              screen_name: "other",
              avatar_url: "https://example.com/quoted.jpg",
            },
          },
        },
        "https://x.com/user/status/123",
      ),
    ).toEqual({
      url: "https://fxtwitter.com/user/status/123",
      authorName: "Display Name",
      handle: "user",
      avatarUrl: "https://example.com/avatar.jpg",
      text: "hello world",
      createdAt: "Tue Apr 27 00:00:00 +0000 2026",
      media: [
        { type: "image", url: "https://example.com/photo.jpg" },
        {
          type: "video",
          url: "https://d.fxtwitter.com/user/status/123.mp4",
          streamUrl: "https://example.com/video-720.mp4",
          posterUrl: "https://example.com/thumb.jpg",
        },
      ],
      quote: {
        authorName: "Quoted User",
        handle: "other",
        avatarUrl: "https://example.com/quoted.jpg",
        text: "quoted",
        url: "https://fxtwitter.com/other/status/456",
        createdAt: "Tue Apr 27 00:05:00 +0000 2026",
        media: [],
      },
      reply: undefined,
      retweet: undefined,
    });
  });

  it("does not expose hls playlists as the tweet video stream url", () => {
    expect(
      buildTweetPreviewFromFxTweet(
        {
          url: "https://x.com/user/status/123",
          text: "",
          author: {
            name: "Display Name",
            screen_name: "user",
          },
          media: {
            all: [
              {
                type: "video",
                url: "https://example.com/video.m3u8",
                thumbnail_url: "https://example.com/thumb.jpg",
                variants: [{ url: "https://example.com/video.m3u8", content_type: "application/x-mpegURL" }],
              },
            ],
          },
        },
        "https://x.com/user/status/123",
      )?.media,
    ).toEqual([
      {
        type: "video",
        url: "https://d.fxtwitter.com/user/status/123.mp4",
        streamUrl: undefined,
        posterUrl: "https://example.com/thumb.jpg",
      },
    ]);
  });

  it("links mentions hashtags and urls inside tweet text", () => {
    expect(splitTweetText("hello @doge #news https://x.com/foo/status/123")).toEqual([
      { type: "text", value: "hello " },
      { type: "link", href: "https://fxtwitter.com/doge", label: "@doge" },
      { type: "text", value: " " },
      { type: "link", href: "https://fxtwitter.com/hashtag/news?src=hashtag_click", label: "#news" },
      { type: "text", value: " " },
      { type: "link", href: "https://fxtwitter.com/foo/status/123", label: "https://fxtwitter.com/foo/status/123" },
    ]);
  });

  it("does not turn email or path fragments into mentions", () => {
    expect(splitTweetText("mail test@example.com and path /@not-a-mention #tag")).toEqual([
      { type: "text", value: "mail test@example.com and path /@not-a-mention " },
      { type: "link", href: "https://fxtwitter.com/hashtag/tag?src=hashtag_click", label: "#tag" },
    ]);
  });
});
