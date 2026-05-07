import { describe, expect, it } from "vitest";
import { extractTenorUrls, normalizeTenorUrl } from "./tenorEmbeds";

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
});
