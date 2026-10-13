import { describe, expect, it } from "vitest";
import { getConstrainedImageSize } from "./browserImage";

describe("getConstrainedImageSize", () => {
  it("keeps small images unchanged", () => {
    expect(getConstrainedImageSize(320, 240)).toEqual({ width: 320, height: 240 });
  });

  it("downscales large square images before reading pixels", () => {
    expect(getConstrainedImageSize(2048, 2048)).toEqual({
      width: 512,
      height: 512,
    });
  });

  it("preserves aspect ratio while downscaling", () => {
    expect(getConstrainedImageSize(2048, 1024)).toEqual({
      width: 512,
      height: 256,
    });
  });
});
