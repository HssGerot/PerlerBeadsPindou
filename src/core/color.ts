import type { BeadColor } from "./palette";

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export function parseHexColor(hex: string): RgbColor {
  const normalized = hex.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function colorDistance(a: RgbColor, b: RgbColor): number {
  const redMean = (a.r + b.r) / 2;
  const red = a.r - b.r;
  const green = a.g - b.g;
  const blue = a.b - b.b;

  return Math.sqrt(
    (2 + redMean / 256) * red * red +
      4 * green * green +
      (2 + (255 - redMean) / 256) * blue * blue,
  );
}

export function findClosestBeadColor(
  rgb: RgbColor,
  palette: BeadColor[],
): BeadColor {
  if (palette.length === 0) {
    throw new Error("Palette must contain at least one color");
  }

  return palette.reduce((closest, candidate) => {
    const closestDistance = colorDistance(rgb, parseHexColor(closest.hex));
    const candidateDistance = colorDistance(rgb, parseHexColor(candidate.hex));
    return candidateDistance < closestDistance ? candidate : closest;
  });
}
