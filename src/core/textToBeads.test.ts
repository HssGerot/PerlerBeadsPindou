import { describe, expect, it } from "vitest";
import {
  createBeadPatternFromText,
  createBeadPatternFromTextMask,
} from "./textToBeads";
import type { BeadColor } from "./palette";

const palette: BeadColor[] = [
  { code: "K1", name: "黑", hex: "#222222" },
  { code: "W1", name: "白", hex: "#F7F2E8" },
];

describe("createBeadPatternFromTextMask", () => {
  it("maps text pixels to the primary color and background pixels to the background color", () => {
    const pattern = createBeadPatternFromTextMask(
      {
        height: 2,
        mask: new Uint8Array([1, 0, 0, 1]),
        width: 2,
      },
      {
        backgroundColor: palette[1],
        textColor: palette[0],
      },
    );

    expect(pattern).toEqual({
      width: 2,
      height: 2,
      cells: [
        { x: 0, y: 0, color: palette[0] },
        { x: 1, y: 0, color: palette[1] },
        { x: 0, y: 1, color: palette[1] },
        { x: 1, y: 1, color: palette[0] },
      ],
    });
  });
});

describe("createBeadPatternFromText", () => {
  it("creates a bead pattern using the optional canvas size", () => {
    const pattern = createBeadPatternFromText(
      {
        beadHeight: 3,
        beadWidth: 4,
        palette,
        text: "福",
      },
      () => ({
        height: 3,
        mask: new Uint8Array([
          0, 1, 1, 0,
          1, 1, 1, 1,
          0, 1, 1, 0,
        ]),
        width: 4,
      }),
    );

    expect(pattern.width).toBe(4);
    expect(pattern.height).toBe(3);
    expect(pattern.cells).toHaveLength(12);
    expect(pattern.cells.filter((cell) => cell.color.code === "K1")).toHaveLength(
      8,
    );
  });

  it("rejects empty text", () => {
    expect(() =>
      createBeadPatternFromText(
        {
          beadHeight: 3,
          beadWidth: 4,
          palette,
          text: "   ",
        },
        () => ({ height: 3, mask: new Uint8Array(12), width: 4 }),
      ),
    ).toThrow("Text must contain at least one character");
  });
});
