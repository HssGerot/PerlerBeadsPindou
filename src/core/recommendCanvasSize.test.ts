import { describe, expect, it } from "vitest";
import { recommendCanvasSize } from "./recommendCanvasSize";

function makeImageData(width: number, height: number, pixels: string[]) {
  const data = new Uint8ClampedArray(width * height * 4);
  const values = pixels.join(" ").split(/\s+/);

  values.forEach((hex, index) => {
    const offset = index * 4;
    data[offset] = Number.parseInt(hex.slice(1, 3), 16);
    data[offset + 1] = Number.parseInt(hex.slice(3, 5), 16);
    data[offset + 2] = Number.parseInt(hex.slice(5, 7), 16);
    data[offset + 3] = 255;
  });

  return { width, height, data, colorSpace: "srgb" } as ImageData;
}

describe("recommendCanvasSize", () => {
  it("keeps simple square images compact", () => {
    const imageData = makeImageData(2, 2, [
      "#FFFFFF #FFFFFF",
      "#FFFFFF #FFFFFF",
    ]);

    expect(recommendCanvasSize(imageData)).toEqual({ width: 40, height: 40 });
  });

  it("uses a larger square size for detailed square images", () => {
    const imageData = makeImageData(3, 3, [
      "#FFFFFF #222222 #FFFFFF",
      "#222222 #F3C852 #222222",
      "#FFFFFF #222222 #FFFFFF",
    ]);

    expect(recommendCanvasSize(imageData)).toEqual({ width: 48, height: 48 });
  });

  it("prefers the landscape preset for wide images", () => {
    const imageData = makeImageData(4, 2, [
      "#FFFFFF #FFFFFF #FFFFFF #FFFFFF",
      "#FFFFFF #FFFFFF #FFFFFF #FFFFFF",
    ]);

    expect(recommendCanvasSize(imageData)).toEqual({ width: 80, height: 60 });
  });

  it("prefers the portrait preset for tall images", () => {
    const imageData = makeImageData(2, 4, [
      "#FFFFFF #FFFFFF",
      "#FFFFFF #FFFFFF",
      "#FFFFFF #FFFFFF",
      "#FFFFFF #FFFFFF",
    ]);

    expect(recommendCanvasSize(imageData)).toEqual({ width: 60, height: 80 });
  });
});
