import { describe, expect, it } from "vitest";
import {
  extractAudioUrls,
  extractImageUrls,
  extractVideoUrls,
  isAudioMimeType,
  isImageMimeType,
  isVideoMimeType,
} from "./imageEmbeds";

describe("image embed helpers", () => {
  it("detects image mime types", () => {
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("text/plain")).toBe(false);
  });

  it("detects video mime types", () => {
    expect(isVideoMimeType("video/mp4")).toBe(true);
    expect(isVideoMimeType("image/png")).toBe(false);
  });

  it("detects audio mime types", () => {
    expect(isAudioMimeType("audio/mpeg")).toBe(true);
    expect(isAudioMimeType("video/mp4")).toBe(false);
  });

  it("extracts image links from text", () => {
    expect(extractImageUrls("look https://example.com/a.png and https://example.com/b.jpg?x=1")).toEqual([
      "https://example.com/a.png",
      "https://example.com/b.jpg?x=1",
    ]);
  });

  it("extracts Twitter image CDN links with format query params", () => {
    expect(extractImageUrls("look https://pbs.twimg.com/media/HHFouE-WMAAro61?format=jpg&name=small")).toEqual([
      "https://pbs.twimg.com/media/HHFouE-WMAAro61?format=jpg&name=small",
    ]);
  });

  it("extracts video links from text", () => {
    expect(extractVideoUrls("watch https://example.com/a.mp4 and https://example.com/b.webm?x=1")).toEqual([
      "https://example.com/a.mp4",
      "https://example.com/b.webm?x=1",
    ]);
  });

  it("extracts audio links from text", () => {
    expect(extractAudioUrls("listen https://example.com/a.mp3 and https://example.com/b.ogg?x=1")).toEqual([
      "https://example.com/a.mp3",
      "https://example.com/b.ogg?x=1",
    ]);
  });
});
