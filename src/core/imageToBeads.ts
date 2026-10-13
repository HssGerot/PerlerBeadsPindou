import { findClosestBeadColor, parseHexColor, type RgbColor } from "./color";
import type { BeadColor } from "./palette";

export type SampleMode = "average" | "dominant";

export type BeadCell = {
  x: number;
  y: number;
  color: BeadColor;
};

export type BeadPattern = {
  width: number;
  height: number;
  cells: BeadCell[];
};

export type PatternStat = {
  code: string;
  name: string;
  color: string;
  count: number;
};

export type CreateBeadPatternOptions = {
  beadWidth: number;
  palette: BeadColor[];
  sampleMode: SampleMode;
};

export function createBeadPatternFromImageData(
  imageData: ImageData,
  options: CreateBeadPatternOptions,
): BeadPattern {
  if (!Number.isFinite(options.beadWidth) || options.beadWidth < 1) {
    throw new Error("Bead width must be at least 1");
  }

  const width = Math.round(options.beadWidth);
  const height = Math.max(1, Math.round((imageData.height / imageData.width) * width));
  const cells: BeadCell[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color =
        options.sampleMode === "dominant"
          ? sampleDominantColor(imageData, x, y, width, height, options.palette)
          : findClosestBeadColor(
              sampleAverageColor(imageData, x, y, width, height),
              options.palette,
            );

      cells.push({ x, y, color });
    }
  }

  return { width, height, cells };
}

export function getPatternStats(pattern: BeadPattern): PatternStat[] {
  const stats = new Map<string, PatternStat>();

  pattern.cells.forEach(({ color }) => {
    const current = stats.get(color.code);
    if (current) {
      current.count += 1;
      return;
    }

    stats.set(color.code, {
      code: color.code,
      name: color.name,
      color: color.hex,
      count: 1,
    });
  });

  return Array.from(stats.values()).sort(
    (a, b) => b.count - a.count || a.code.localeCompare(b.code),
  );
}

function sampleAverageColor(
  imageData: ImageData,
  cellX: number,
  cellY: number,
  gridWidth: number,
  gridHeight: number,
): RgbColor {
  const bounds = getSourceBounds(imageData, cellX, cellY, gridWidth, gridHeight);
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let y = bounds.yStart; y < bounds.yEnd; y += 1) {
    for (let x = bounds.xStart; x < bounds.xEnd; x += 1) {
      const pixel = readPixel(imageData, x, y);
      red += pixel.r;
      green += pixel.g;
      blue += pixel.b;
      count += 1;
    }
  }

  return {
    r: Math.round(red / count),
    g: Math.round(green / count),
    b: Math.round(blue / count),
  };
}

function sampleDominantColor(
  imageData: ImageData,
  cellX: number,
  cellY: number,
  gridWidth: number,
  gridHeight: number,
  palette: BeadColor[],
): BeadColor {
  const bounds = getSourceBounds(imageData, cellX, cellY, gridWidth, gridHeight);
  const counts = new Map<string, { color: BeadColor; count: number }>();

  for (let y = bounds.yStart; y < bounds.yEnd; y += 1) {
    for (let x = bounds.xStart; x < bounds.xEnd; x += 1) {
      const color = findClosestBeadColor(readPixel(imageData, x, y), palette);
      const current = counts.get(color.code);
      counts.set(color.code, {
        color,
        count: current ? current.count + 1 : 1,
      });
    }
  }

  return Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.color.code.localeCompare(b.color.code),
  )[0].color;
}

function getSourceBounds(
  imageData: ImageData,
  cellX: number,
  cellY: number,
  gridWidth: number,
  gridHeight: number,
) {
  const xStart = Math.floor((cellX / gridWidth) * imageData.width);
  const xEnd = Math.max(
    xStart + 1,
    Math.floor(((cellX + 1) / gridWidth) * imageData.width),
  );
  const yStart = Math.floor((cellY / gridHeight) * imageData.height);
  const yEnd = Math.max(
    yStart + 1,
    Math.floor(((cellY + 1) / gridHeight) * imageData.height),
  );

  return {
    xStart: Math.min(xStart, imageData.width - 1),
    xEnd: Math.min(xEnd, imageData.width),
    yStart: Math.min(yStart, imageData.height - 1),
    yEnd: Math.min(yEnd, imageData.height),
  };
}

function readPixel(imageData: ImageData, x: number, y: number): RgbColor {
  const index = (y * imageData.width + x) * 4;
  const alpha = imageData.data[index + 3] / 255;
  const background = parseHexColor("#FFFFFF");

  return {
    r: Math.round(imageData.data[index] * alpha + background.r * (1 - alpha)),
    g: Math.round(imageData.data[index + 1] * alpha + background.g * (1 - alpha)),
    b: Math.round(imageData.data[index + 2] * alpha + background.b * (1 - alpha)),
  };
}
