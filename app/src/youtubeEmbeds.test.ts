import { describe, expect, it } from "vitest";
import { buildYouTubeEmbedUrl, extractYouTubeUrls, getYouTubeVideoId } from "./youtubeEmbeds";

describe("youtube embed helpers", () => {
  it("extracts youtube urls", () => {
    expect(extractYouTubeUrls("watch https://www.youtube.com/shorts/Y7_Wi0RIAEg and https://youtu.be/dQw4w9WgXcQ")).toEqual([
      "https://www.youtube.com/shorts/Y7_Wi0RIAEg",
      "https://youtu.be/dQw4w9WgXcQ",
    ]);
  });

  it("extracts ids from shorts and watch urls", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/shorts/Y7_Wi0RIAEg")).toBe("Y7_Wi0RIAEg");
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("builds autoplay embed urls", () => {
    expect(buildYouTubeEmbedUrl("dQw4w9WgXcQ")).toContain("autoplay=1");
    expect(buildYouTubeEmbedUrl("dQw4w9WgXcQ")).toContain("/embed/dQw4w9WgXcQ");
  });
});
