import { describe, expect, it } from "vitest";
import {
  createBeadPatternFromImageData,
  getPatternStats,
} from "./imageToBeads";
import { findClosestBeadColor, parseHexColor } from "./color";
import { fullPalette, starterPalette, type BeadColor } from "./palette";

function makeImageData(width: number, height: number, rows: string[]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  rows.forEach((row, y) => {
    row.split(" ").forEach((hex, x) => {
      const { r, g, b } = parseHexColor(hex);
      const index = (y * width + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    });
  });

  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

function makeImageDataWithAlpha(
  width: number,
  height: number,
  pixels: Array<[number, number, number, number]>,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  pixels.forEach(([r, g, b, a], index) => {
    const offset = index * 4;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  });

  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

const testPalette: BeadColor[] = [
  { code: "R1", name: "红", hex: "#D94A38" },
  { code: "B1", name: "蓝", hex: "#3466B8" },
  { code: "W1", name: "白", hex: "#F7F2E8" },
  { code: "K1", name: "黑", hex: "#222222" },
];

describe("color matching", () => {
  it("parses hex colors into RGB channels", () => {
    expect(parseHexColor("#F7EFD8")).toEqual({ r: 247, g: 239, b: 216 });
  });

  it("finds the closest palette color", () => {
    expect(findClosestBeadColor({ r: 218, g: 76, b: 60 }, testPalette)).toEqual(
      testPalette[0],
    );
  });

  it("uses perceptual Oklab distance for close color choices", () => {
    const perceptualPalette: BeadColor[] = [
      { code: "G", name: "绿青", hex: "#00C894" },
      { code: "P", name: "粉紫", hex: "#D87E92" },
    ];

    expect(
      findClosestBeadColor({ r: 87, g: 118, b: 168 }, perceptualPalette).code,
    ).toBe("P");
  });
});

describe("palette presets", () => {
  it("keeps the 48-color starter palette smaller than the full palette", () => {
    expect(starterPalette).toHaveLength(48);
    expect(fullPalette.length).toBeGreaterThan(starterPalette.length);
  });
});

describe("createBeadPatternFromImageData", () => {
  it("uses explicit bead width and height when both are provided", () => {
    const source = makeImageData(4, 2, [
      "#D94A38 #D94A38 #3466B8 #3466B8",
      "#D94A38 #D94A38 #3466B8 #3466B8",
    ]);

    const pattern = createBeadPatternFromImageData(source, {
      beadHeight: 2,
      beadWidth: 2,
      palette: testPalette,
      sampleMode: "average",
    });

    expect(pattern.width).toBe(2);
    expect(pattern.height).toBe(2);
    expect(pattern.cells).toHaveLength(4);
  });

  it("samples an image into a bead grid using average colors", () => {
    const source = makeImageData(4, 2, [
      "#D94A38 #D94A38 #3466B8 #3466B8",
      "#D94A38 #D94A38 #3466B8 #3466B8",
    ]);

    const pattern = createBeadPatternFromImageData(source, {
      beadWidth: 2,
      palette: testPalette,
      sampleMode: "average",
    });

    expect(pattern.width).toBe(2);
    expect(pattern.height).toBe(1);
    expect(pattern.cells.map((cell) => cell.color.code)).toEqual(["R1", "B1"]);
  });

  it("crops border-connected near-white background before sampling", () => {
    const source = makeImageData(4, 4, [
      "#FFFFFF #FFFFFF #FFFFFF #FFFFFF",
      "#FFFFFF #D94A38 #D94A38 #FFFFFF",
      "#FFFFFF #3466B8 #3466B8 #FFFFFF",
      "#FFFFFF #FFFFFF #FFFFFF #FFFFFF",
    ]);

    const pattern = createBeadPatternFromImageData(source, {
      beadHeight: 2,
      beadWidth: 2,
      palette: testPalette,
      sampleMode: "average",
    });

    expect(pattern.cells.map((cell) => cell.color.code)).toEqual([
      "R1",
      "R1",
      "B1",
      "B1",
    ]);
  });

  it("keeps near-white pixels that are enclosed inside the subject", () => {
    const source = makeImageData(3, 3, [
      "#D94A38 #D94A38 #D94A38",
      "#D94A38 #FFFFFF #D94A38",
      "#D94A38 #D94A38 #D94A38",
    ]);

    const pattern = createBeadPatternFromImageData(source, {
      beadHeight: 3,
      beadWidth: 3,
      palette: testPalette,
      sampleMode: "average",
    });

    expect(pattern.cells[4].color.code).toBe("W1");
  });

  it("crops transparent border background before sampling", () => {
    const transparent = [255, 255, 255, 0] as [number, number, number, number];
    const red = [217, 74, 56, 255] as [number, number, number, number];
    const blue = [52, 102, 184, 255] as [number, number, number, number];
    const source = makeImageDataWithAlpha(3, 3, [
      transparent,
      transparent,
      transparent,
      transparent,
      red,
      transparent,
      transparent,
      blue,
      transparent,
    ]);

    const pattern = createBeadPatternFromImageData(source, {
      beadHeight: 2,
      beadWidth: 1,
      palette: testPalette,
      sampleMode: "average",
    });

    expect(pattern.cells.map((cell) => cell.color.code)).toEqual(["R1", "B1"]);
  });

  it("uses the most frequent matched color in dominant mode", () => {
    const source = makeImageData(2, 2, [
      "#D94A38 #D94A38",
      "#3466B8 #D94A38",
    ]);

    const pattern = createBeadPatternFromImageData(source, {
      beadWidth: 1,
      palette: testPalette,
      sampleMode: "dominant",
    });

    expect(pattern.cells[0].color.code).toBe("R1");
  });

  it("returns color usage sorted by count", () => {
    const source = makeImageData(4, 2, [
      "#D94A38 #D94A38 #3466B8 #3466B8",
      "#D94A38 #D94A38 #3466B8 #3466B8",
    ]);
    const pattern = createBeadPatternFromImageData(source, {
      beadWidth: 2,
      palette: testPalette,
      sampleMode: "average",
    });

    expect(getPatternStats(pattern)).toEqual([
      { code: "B1", name: "蓝", color: "#3466B8", count: 1 },
      { code: "R1", name: "红", color: "#D94A38", count: 1 },
    ]);
  });
});
