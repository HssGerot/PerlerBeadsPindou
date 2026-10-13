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
});

describe("palette presets", () => {
  it("keeps the 48-color starter palette smaller than the full palette", () => {
    expect(starterPalette).toHaveLength(48);
    expect(fullPalette.length).toBeGreaterThan(starterPalette.length);
  });
});

describe("createBeadPatternFromImageData", () => {
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
