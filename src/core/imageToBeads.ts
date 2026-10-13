import {
  createClosestBeadColorFinder,
  type RgbColor,
} from "./color";
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
  beadHeight?: number;
  beadWidth: number;
  palette: BeadColor[];
  sampleMode: SampleMode;
};

type SourceRegion = {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
};

export function createBeadPatternFromImageData(
  imageData: ImageData,
  options: CreateBeadPatternOptions,
): BeadPattern {
  if (!Number.isFinite(options.beadWidth) || options.beadWidth < 1) {
    throw new Error("Bead width must be at least 1");
  }
  if (
    options.beadHeight !== undefined &&
    (!Number.isFinite(options.beadHeight) || options.beadHeight < 1)
  ) {
    throw new Error("Bead height must be at least 1");
  }

  const width = Math.round(options.beadWidth);
  const height =
    options.beadHeight === undefined
      ? Math.max(1, Math.round((imageData.height / imageData.width) * width))
      : Math.round(options.beadHeight);
  const cells: BeadCell[] = [];
  const sourceRegion = getContentSourceRegion(imageData);
  const findClosestColor = createClosestBeadColorFinder(options.palette);
  const colorCache = new Map<number, BeadColor>();
  const findClosestColorCached = (rgb: RgbColor) => {
    const key = (rgb.r << 16) | (rgb.g << 8) | rgb.b;
    const cached = colorCache.get(key);
    if (cached) {
      return cached;
    }

    const color = findClosestColor(rgb);
    colorCache.set(key, color);
    return color;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color =
        options.sampleMode === "dominant"
          ? sampleDominantColor(
              imageData,
              x,
              y,
              width,
              height,
              sourceRegion,
              findClosestColorCached,
            )
          : findClosestColor(
              sampleAverageColor(imageData, x, y, width, height, sourceRegion),
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
  sourceRegion: SourceRegion,
): RgbColor {
  const bounds = getSourceBounds(
    imageData,
    cellX,
    cellY,
    gridWidth,
    gridHeight,
    sourceRegion,
  );
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
  sourceRegion: SourceRegion,
  findClosestColor: (rgb: RgbColor) => BeadColor,
): BeadColor {
  const bounds = getSourceBounds(
    imageData,
    cellX,
    cellY,
    gridWidth,
    gridHeight,
    sourceRegion,
  );
  const counts = new Map<string, { color: BeadColor; count: number }>();

  for (let y = bounds.yStart; y < bounds.yEnd; y += 1) {
    for (let x = bounds.xStart; x < bounds.xEnd; x += 1) {
      const color = findClosestColor(readPixel(imageData, x, y));
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
  sourceRegion: SourceRegion,
) {
  const sourceWidth = sourceRegion.xEnd - sourceRegion.xStart;
  const sourceHeight = sourceRegion.yEnd - sourceRegion.yStart;
  const xStart =
    sourceRegion.xStart + Math.floor((cellX / gridWidth) * sourceWidth);
  const xEnd = Math.max(
    xStart + 1,
    sourceRegion.xStart +
      Math.floor(((cellX + 1) / gridWidth) * sourceWidth),
  );
  const yStart =
    sourceRegion.yStart + Math.floor((cellY / gridHeight) * sourceHeight);
  const yEnd = Math.max(
    yStart + 1,
    sourceRegion.yStart +
      Math.floor(((cellY + 1) / gridHeight) * sourceHeight),
  );

  return {
    xStart: Math.min(xStart, sourceRegion.xEnd - 1),
    xEnd: Math.min(xEnd, sourceRegion.xEnd),
    yStart: Math.min(yStart, sourceRegion.yEnd - 1),
    yEnd: Math.min(yEnd, sourceRegion.yEnd),
  };
}

function getContentSourceRegion(imageData: ImageData): SourceRegion {
  const background = findBorderConnectedBackground(imageData);
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = y * imageData.width + x;

      if (background[index]) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return getFullSourceRegion(imageData);
  }

  return {
    xStart: minX,
    xEnd: maxX + 1,
    yStart: minY,
    yEnd: maxY + 1,
  };
}

function getFullSourceRegion(imageData: ImageData): SourceRegion {
  return {
    xStart: 0,
    xEnd: imageData.width,
    yStart: 0,
    yEnd: imageData.height,
  };
}

function findBorderConnectedBackground(imageData: ImageData): Uint8Array {
  const background = new Uint8Array(imageData.width * imageData.height);
  const queue: number[] = [];
  let cursor = 0;
  const enqueue = (x: number, y: number) => {
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
      return;
    }

    const index = y * imageData.width + x;
    if (background[index] || !isBackgroundPixel(imageData, x, y)) {
      return;
    }

    background[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < imageData.width; x += 1) {
    enqueue(x, 0);
    enqueue(x, imageData.height - 1);
  }
  for (let y = 1; y < imageData.height - 1; y += 1) {
    enqueue(0, y);
    enqueue(imageData.width - 1, y);
  }

  while (cursor < queue.length) {
    const index = queue[cursor];
    cursor += 1;

    const x = index % imageData.width;
    const y = Math.floor(index / imageData.width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return background;
}

function isBackgroundPixel(imageData: ImageData, x: number, y: number): boolean {
  const index = (y * imageData.width + x) * 4;
  const alpha = imageData.data[index + 3];

  if (alpha <= 16) {
    return true;
  }

  const red = imageData.data[index];
  const green = imageData.data[index + 1];
  const blue = imageData.data[index + 2];

  return red >= 245 && green >= 245 && blue >= 245;
}

function readPixel(imageData: ImageData, x: number, y: number): RgbColor {
  const index = (y * imageData.width + x) * 4;
  const alpha = imageData.data[index + 3] / 255;

  return {
    r: Math.round(imageData.data[index] * alpha + 255 * (1 - alpha)),
    g: Math.round(imageData.data[index + 1] * alpha + 255 * (1 - alpha)),
    b: Math.round(imageData.data[index + 2] * alpha + 255 * (1 - alpha)),
  };
}
