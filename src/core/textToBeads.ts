import type { BeadPattern } from "./imageToBeads";
import type { BeadColor } from "./palette";

export type TextStyle = "bold" | "rounded" | "pixel";

export type TextMask = {
  width: number;
  height: number;
  mask: Uint8Array;
};

export type CreateTextBeadPatternOptions = {
  beadHeight: number;
  beadWidth: number;
  palette: BeadColor[];
  text: string;
  textStyle?: TextStyle;
};

export type TextMaskRenderer = (
  text: string,
  options: {
    height: number;
    textStyle: TextStyle;
    width: number;
  },
) => TextMask;

export function createBeadPatternFromText(
  options: CreateTextBeadPatternOptions,
  renderTextMask: TextMaskRenderer = renderTextMaskWithCanvas,
): BeadPattern {
  const text = options.text.trim();

  if (text.length === 0) {
    throw new Error("Text must contain at least one character");
  }
  if (!Number.isFinite(options.beadWidth) || options.beadWidth < 1) {
    throw new Error("Bead width must be at least 1");
  }
  if (!Number.isFinite(options.beadHeight) || options.beadHeight < 1) {
    throw new Error("Bead height must be at least 1");
  }

  const width = Math.round(options.beadWidth);
  const height = Math.round(options.beadHeight);
  const mask = renderTextMask(text.slice(0, 8), {
    height,
    textStyle: options.textStyle ?? "bold",
    width,
  });

  return createBeadPatternFromTextMask(mask, {
    backgroundColor: getDefaultBackgroundColor(options.palette),
    textColor: getDefaultTextColor(options.palette),
  });
}

export function createBeadPatternFromTextMask(
  textMask: TextMask,
  colors: {
    backgroundColor: BeadColor;
    textColor: BeadColor;
  },
): BeadPattern {
  if (textMask.mask.length !== textMask.width * textMask.height) {
    throw new Error("Text mask size must match width and height");
  }

  const cells = Array.from(textMask.mask, (value, index) => {
    const x = index % textMask.width;
    const y = Math.floor(index / textMask.width);

    return {
      x,
      y,
      color: value > 0 ? colors.textColor : colors.backgroundColor,
    };
  });

  return {
    width: textMask.width,
    height: textMask.height,
    cells,
  };
}

function renderTextMaskWithCanvas(
  text: string,
  options: {
    height: number;
    textStyle: TextStyle;
    width: number;
  },
): TextMask {
  if (typeof document === "undefined" || isJsdomRuntime()) {
    return renderFallbackTextMask(text, options.width, options.height);
  }

  const canvas = document.createElement("canvas");
  const scale = 4;
  canvas.width = options.width * scale;
  canvas.height = options.height * scale;

  const context = canvas.getContext("2d");
  if (!context) {
    return renderFallbackTextMask(text, options.width, options.height);
  }

  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.imageSmoothingEnabled = options.textStyle !== "pixel";

  const fontFamily =
    options.textStyle === "pixel"
      ? '"Courier New", monospace'
      : options.textStyle === "rounded"
        ? '"Arial Rounded MT Bold", "PingFang SC", system-ui, sans-serif'
        : '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
  const fontWeight = options.textStyle === "pixel" ? 700 : 900;
  const maxWidth = canvas.width * 0.82;
  const maxHeight = canvas.height * 0.76;
  let fontSize = Math.floor(maxHeight);

  while (fontSize > scale * 6) {
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const metrics = context.measureText(text);
    const measuredHeight =
      (metrics.actualBoundingBoxAscent || fontSize * 0.8) +
      (metrics.actualBoundingBoxDescent || fontSize * 0.2);

    if (metrics.width <= maxWidth && measuredHeight <= maxHeight) {
      break;
    }

    fontSize -= scale;
  }

  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const mask = new Uint8Array(options.width * options.height);

  for (let gridY = 0; gridY < options.height; gridY += 1) {
    for (let gridX = 0; gridX < options.width; gridX += 1) {
      const bounds = getSampleBounds(gridX, gridY, scale);
      let litPixels = 0;
      let totalPixels = 0;

      for (let y = bounds.yStart; y < bounds.yEnd; y += 1) {
        for (let x = bounds.xStart; x < bounds.xEnd; x += 1) {
          const index = (y * canvas.width + x) * 4;
          litPixels += imageData.data[index] > 128 ? 1 : 0;
          totalPixels += 1;
        }
      }

      mask[gridY * options.width + gridX] = litPixels / totalPixels >= 0.18 ? 1 : 0;
    }
  }

  return {
    width: options.width,
    height: options.height,
    mask,
  };
}

function getSampleBounds(gridX: number, gridY: number, scale: number) {
  return {
    xStart: gridX * scale,
    xEnd: (gridX + 1) * scale,
    yStart: gridY * scale,
    yEnd: (gridY + 1) * scale,
  };
}

function isJsdomRuntime() {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("jsdom")
  );
}

function renderFallbackTextMask(
  text: string,
  width: number,
  height: number,
): TextMask {
  const mask = new Uint8Array(width * height);
  const textWidth = Math.min(width - 4, Math.max(4, text.length * 6));
  const textHeight = Math.max(5, Math.round(height * 0.48));
  const xStart = Math.max(1, Math.floor((width - textWidth) / 2));
  const xEnd = Math.min(width - 1, xStart + textWidth);
  const yStart = Math.max(1, Math.floor((height - textHeight) / 2));
  const yEnd = Math.min(height - 1, yStart + textHeight);

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const nearHorizontalStroke =
        y === yStart || y === yEnd - 1 || y === Math.floor((yStart + yEnd) / 2);
      const nearVerticalStroke =
        x === xStart || x === xEnd - 1 || x === Math.floor((xStart + xEnd) / 2);

      if (nearHorizontalStroke || nearVerticalStroke) {
        mask[y * width + x] = 1;
      }
    }
  }

  return { width, height, mask };
}

function getDefaultTextColor(palette: BeadColor[]): BeadColor {
  const color = palette.find((item) => item.code === "K1") ?? palette[0];
  if (!color) {
    throw new Error("Palette must contain at least one color");
  }

  return color;
}

function getDefaultBackgroundColor(palette: BeadColor[]): BeadColor {
  const color =
    palette.find((item) => item.code === "W1") ??
    palette.find((item) => item.hex.toLowerCase() === "#ffffff") ??
    palette[0];
  if (!color) {
    throw new Error("Palette must contain at least one color");
  }

  return color;
}
