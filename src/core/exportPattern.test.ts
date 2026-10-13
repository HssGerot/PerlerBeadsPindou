import { describe, expect, it, vi } from "vitest";
import { createPatternPngBlob } from "./exportPattern";
import type { BeadPattern, PatternStat } from "./imageToBeads";

const pattern: BeadPattern = {
  width: 2,
  height: 1,
  cells: [
    { x: 0, y: 0, color: { code: "R1", name: "正红", hex: "#D94A38" } },
    { x: 1, y: 0, color: { code: "B1", name: "蓝", hex: "#3466B8" } },
  ],
};

const stats: PatternStat[] = [
  { code: "R1", name: "正红", color: "#D94A38", count: 1 },
  { code: "B1", name: "蓝", color: "#3466B8", count: 1 },
];

function makeCanvasFixture() {
  const fillText = vi.fn();
  const strokeRect = vi.fn();
  const fillRect = vi.fn();
  const beginPath = vi.fn();
  const arc = vi.fn();
  const fill = vi.fn();
  const stroke = vi.fn();
  const measureText = vi.fn((text: string) => ({ width: text.length * 8 }));
  const context = {
    fillText,
    strokeRect,
    fillRect,
    beginPath,
    arc,
    fill,
    stroke,
    measureText,
    set fillStyle(_value: string) {},
    set strokeStyle(_value: string) {},
    set font(_value: string) {},
    set lineWidth(_value: number) {},
    set textAlign(_value: CanvasTextAlign) {},
    set textBaseline(_value: CanvasTextBaseline) {},
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback, type?: string) => {
      callback(new Blob(["png"], { type: type ?? "image/png" }));
    }),
  } as unknown as HTMLCanvasElement;

  return { canvas, context };
}

describe("createPatternPngBlob", () => {
  it("renders the bead pattern and legend to a png blob", async () => {
    const { canvas, context } = makeCanvasFixture();

    const blob = await createPatternPngBlob(pattern, stats, {
      createCanvas: () => canvas,
      showCodes: true,
      showGrid: true,
    });

    expect(blob.type).toBe("image/png");
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
    expect(context.arc).toHaveBeenCalledTimes(2);
    expect(context.strokeRect).toHaveBeenCalled();
    expect(context.fillText).toHaveBeenCalledWith("R1", expect.any(Number), expect.any(Number));
    expect(context.fillText).toHaveBeenCalledWith(
      "色号用量",
      expect.any(Number),
      expect.any(Number),
    );
  });
});
