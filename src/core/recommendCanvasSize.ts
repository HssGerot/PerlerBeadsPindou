export type RecommendedCanvasSize = {
  width: number;
  height: number;
};

const SQUARE_COMPACT = { width: 40, height: 40 };
const SQUARE_DETAILED = { width: 48, height: 48 };
const LANDSCAPE = { width: 80, height: 60 };
const PORTRAIT = { width: 60, height: 80 };

const LANDSCAPE_RATIO = 1.18;
const PORTRAIT_RATIO = 1 / LANDSCAPE_RATIO;
const DETAIL_SCORE_THRESHOLD = 24;

export function recommendCanvasSize(imageData: ImageData): RecommendedCanvasSize {
  const ratio = imageData.width / imageData.height;

  if (ratio >= LANDSCAPE_RATIO) {
    return LANDSCAPE;
  }

  if (ratio <= PORTRAIT_RATIO) {
    return PORTRAIT;
  }

  return getDetailScore(imageData) >= DETAIL_SCORE_THRESHOLD
    ? SQUARE_DETAILED
    : SQUARE_COMPACT;
}

function getDetailScore(imageData: ImageData) {
  const stepX = Math.max(1, Math.floor(imageData.width / 24));
  const stepY = Math.max(1, Math.floor(imageData.height / 24));
  let totalDelta = 0;
  let comparisons = 0;

  for (let y = 0; y < imageData.height; y += stepY) {
    for (let x = 0; x < imageData.width; x += stepX) {
      const current = readRgb(imageData, x, y);

      if (x + stepX < imageData.width) {
        totalDelta += getRgbDelta(current, readRgb(imageData, x + stepX, y));
        comparisons += 1;
      }

      if (y + stepY < imageData.height) {
        totalDelta += getRgbDelta(current, readRgb(imageData, x, y + stepY));
        comparisons += 1;
      }
    }
  }

  return comparisons === 0 ? 0 : totalDelta / comparisons;
}

function readRgb(imageData: ImageData, x: number, y: number) {
  const index = (y * imageData.width + x) * 4;

  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
  };
}

function getRgbDelta(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
) {
  return (Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)) / 3;
}
