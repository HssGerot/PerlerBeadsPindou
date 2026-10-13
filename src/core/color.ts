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
  return Math.sqrt(colorDistanceScore(a, b));
}

type OklabColor = {
  l: number;
  a: number;
  b: number;
};

function colorDistanceScore(a: RgbColor, b: RgbColor): number {
  return oklabDistanceScore(rgbToOklab(a), rgbToOklab(b));
}

function oklabDistanceScore(a: OklabColor, b: OklabColor): number {
  const lightness = a.l - b.l;
  const greenRed = a.a - b.a;
  const blueYellow = a.b - b.b;

  return lightness * lightness + greenRed * greenRed + blueYellow * blueYellow;
}

function rgbToOklab(rgb: RgbColor): OklabColor {
  const red = srgbToLinear(rgb.r);
  const green = srgbToLinear(rgb.g);
  const blue = srgbToLinear(rgb.b);

  const longCone =
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
  const mediumCone =
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
  const shortCone =
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;

  const long = Math.cbrt(longCone);
  const medium = Math.cbrt(mediumCone);
  const short = Math.cbrt(shortCone);

  return {
    l: 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    a: 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    b: 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
  };
}

function srgbToLinear(channel: number): number {
  const normalized = channel / 255;

  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }

  return ((normalized + 0.055) / 1.055) ** 2.4;
}

export function findClosestBeadColor(
  rgb: RgbColor,
  palette: BeadColor[],
): BeadColor {
  if (palette.length === 0) {
    throw new Error("Palette must contain at least one color");
  }

  return createClosestBeadColorFinder(palette)(rgb);
}

export function createClosestBeadColorFinder(palette: BeadColor[]) {
  if (palette.length === 0) {
    throw new Error("Palette must contain at least one color");
  }

  const parsedPalette = palette.map((color) => ({
    color,
    oklab: rgbToOklab(parseHexColor(color.hex)),
  }));

  return (rgb: RgbColor): BeadColor => {
    const target = rgbToOklab(rgb);
    let closest = parsedPalette[0];
    let closestDistance = oklabDistanceScore(target, closest.oklab);

    for (let index = 1; index < parsedPalette.length; index += 1) {
      const candidate = parsedPalette[index];
      const candidateDistance = oklabDistanceScore(target, candidate.oklab);

      if (candidateDistance < closestDistance) {
        closest = candidate;
        closestDistance = candidateDistance;
      }
    }

    return closest.color;
  };
}
