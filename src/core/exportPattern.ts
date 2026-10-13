import type { BeadPattern, PatternStat } from "./imageToBeads";

export type PatternExportOptions = {
  showCodes: boolean;
  showGrid: boolean;
  createCanvas?: () => HTMLCanvasElement;
};

const CELL_SIZE = 28;
const PAGE_PADDING = 32;
const LEGEND_GAP = 28;
const LEGEND_WIDTH = 220;
const LEGEND_ROW_HEIGHT = 26;

export async function createPatternPngBlob(
  pattern: BeadPattern,
  stats: PatternStat[],
  options: PatternExportOptions,
): Promise<Blob> {
  const canvas = options.createCanvas?.() ?? document.createElement("canvas");
  const patternWidth = pattern.width * CELL_SIZE;
  const patternHeight = pattern.height * CELL_SIZE;
  const legendHeight = 54 + stats.length * LEGEND_ROW_HEIGHT;

  canvas.width = PAGE_PADDING * 2 + patternWidth + LEGEND_GAP + LEGEND_WIDTH;
  canvas.height = PAGE_PADDING * 2 + Math.max(patternHeight, legendHeight);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持生成图纸");
  }

  drawBackground(context, canvas.width, canvas.height);
  drawPattern(context, pattern, options);
  drawLegend(context, patternWidth + PAGE_PADDING + LEGEND_GAP, PAGE_PADDING, stats);

  return canvasToPngBlob(canvas);
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.fillStyle = "#fffaf2";
  context.fillRect(0, 0, width, height);
}

function drawPattern(
  context: CanvasRenderingContext2D,
  pattern: BeadPattern,
  options: PatternExportOptions,
) {
  pattern.cells.forEach((cell) => {
    const left = PAGE_PADDING + cell.x * CELL_SIZE;
    const top = PAGE_PADDING + cell.y * CELL_SIZE;
    const centerX = left + CELL_SIZE / 2;
    const centerY = top + CELL_SIZE / 2;

    context.beginPath();
    context.fillStyle = cell.color.hex;
    context.arc(centerX, centerY, CELL_SIZE * 0.42, 0, Math.PI * 2);
    context.fill();

    if (options.showGrid) {
      context.strokeStyle = "rgba(27, 27, 31, 0.22)";
      context.lineWidth = 1;
      context.strokeRect(left, top, CELL_SIZE, CELL_SIZE);
    }

    if (options.showCodes) {
      context.fillStyle = "#1b1b1f";
      context.font = "700 8px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(cell.color.code, centerX, centerY);
    }
  });
}

function drawLegend(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  stats: PatternStat[],
) {
  context.fillStyle = "#1b1b1f";
  context.font = "700 18px sans-serif";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillText("色号用量", left, top + 18);

  context.font = "500 12px sans-serif";
  stats.forEach((stat, index) => {
    const rowTop = top + 42 + index * LEGEND_ROW_HEIGHT;

    context.fillStyle = stat.color;
    context.fillRect(left, rowTop, 16, 16);
    context.strokeStyle = "rgba(27, 27, 31, 0.22)";
    context.strokeRect(left, rowTop, 16, 16);

    context.fillStyle = "#1b1b1f";
    context.fillText(
      `${stat.code} ${stat.name} x ${stat.count}`,
      left + 24,
      rowTop + 13,
    );
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG 图纸生成失败"));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}
