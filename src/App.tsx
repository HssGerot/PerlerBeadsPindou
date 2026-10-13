import { useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import {
  readImageFileAsImageData,
  type ImageDataLoader,
} from "./core/browserImage";
import { downloadBlobAsFile } from "./core/downloadFile";
import { createPatternPngBlob } from "./core/exportPattern";
import {
  createBeadPatternFromImageData,
  getPatternStats,
  type BeadPattern,
  type SampleMode,
} from "./core/imageToBeads";
import { fullPalette, starterPalette } from "./core/palette";
import { recommendCanvasSize } from "./core/recommendCanvasSize";
import {
  createBeadPatternFromText,
  type TextStyle,
} from "./core/textToBeads";
import "./styles.css";

type CreationMode = "image" | "text";
type PaletteMode = "starter" | "full";

type CanvasSize = {
  width: number;
  height: number;
};

const CANVAS_SIZE_LIMIT = {
  min: 16,
  max: 160,
};

const CANVAS_SIZE_PRESETS: CanvasSize[] = [
  { width: 40, height: 40 },
  { width: 48, height: 48 },
  { width: 60, height: 80 },
  { width: 80, height: 60 },
  { width: 100, height: 100 },
];

const DEFAULT_CANVAS_SIZE = CANVAS_SIZE_PRESETS[0];

type AppProps = {
  imageDataLoader?: ImageDataLoader;
  patternExporter?: typeof createPatternPngBlob;
  fileDownloader?: typeof downloadBlobAsFile;
};

function App({
  fileDownloader = downloadBlobAsFile,
  imageDataLoader = readImageFileAsImageData,
  patternExporter = createPatternPngBlob,
}: AppProps) {
  const [creationMode, setCreationMode] = useState<CreationMode>("image");
  const [fileName, setFileName] = useState("");
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [textInput, setTextInput] = useState("福");
  const [textStyle, setTextStyle] = useState<TextStyle>("bold");
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(DEFAULT_CANVAS_SIZE);
  const [canvasWidthInput, setCanvasWidthInput] = useState(
    String(DEFAULT_CANVAS_SIZE.width),
  );
  const [canvasHeightInput, setCanvasHeightInput] = useState(
    String(DEFAULT_CANVAS_SIZE.height),
  );
  const [sampleMode, setSampleMode] = useState<SampleMode>("dominant");
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("full");
  const [showCodes, setShowCodes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const palette = paletteMode === "starter" ? starterPalette : fullPalette;
  const pattern = useMemo(() => {
    if (creationMode === "text") {
      return textInput.trim()
        ? createBeadPatternFromText({
            beadHeight: canvasSize.height,
            beadWidth: canvasSize.width,
            palette,
            text: textInput,
            textStyle,
          })
        : null;
    }

    return imageData
      ? createBeadPatternFromImageData(imageData, {
            beadHeight: canvasSize.height,
            beadWidth: canvasSize.width,
            palette,
            sampleMode,
          })
      : null;
  }, [
    canvasSize.height,
    canvasSize.width,
    creationMode,
    imageData,
    palette,
    sampleMode,
    textInput,
    textStyle,
  ]);
  const stats = pattern ? getPatternStats(pattern) : [];

  const selectedPreset = CANVAS_SIZE_PRESETS.find(
    (preset) =>
      preset.width === canvasSize.width && preset.height === canvasSize.height,
  );

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    setError("");
    setFileName(file.name);

    try {
      const loadedImageData = await imageDataLoader(file);
      setImageData(loadedImageData);
    } catch (currentError) {
      setImageData(null);
      setError(
        currentError instanceof Error
          ? currentError.message
          : "图片读取失败，请换一张图片重试",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFileName("");
    setImageData(null);
    setTextInput("福");
    setError("");
  };

  const applyCanvasSize = (nextSize: CanvasSize) => {
    const width = clampCanvasDimension(nextSize.width);
    const height = clampCanvasDimension(nextSize.height);

    setCanvasSize({ width, height });
    setCanvasWidthInput(String(width));
    setCanvasHeightInput(String(height));
  };

  const handleCanvasWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCanvasWidthInput(value);

    const width = Number(value);
    if (Number.isFinite(width)) {
      setCanvasSize((current) => ({
        ...current,
        width: clampCanvasDimension(width),
      }));
    }
  };

  const handleCanvasHeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCanvasHeightInput(value);

    const height = Number(value);
    if (Number.isFinite(height)) {
      setCanvasSize((current) => ({
        ...current,
        height: clampCanvasDimension(height),
      }));
    }
  };

  const handleRecommendCanvasSize = () => {
    if (creationMode === "text") {
      applyCanvasSize(recommendTextCanvasSize(textInput));
      return;
    }

    if (!imageData) {
      return;
    }

    applyCanvasSize(recommendCanvasSize(imageData));
  };

  const handleDownloadPattern = async () => {
    if (!pattern) {
      return;
    }

    setIsExporting(true);
    setError("");

    try {
      const blob = await patternExporter(pattern, stats, { showCodes, showGrid });
      fileDownloader(
        blob,
        getPatternFileName({
          fileName,
          mode: creationMode,
          text: textInput,
        }),
      );
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "图纸下载失败，请重试",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
          <div>
            <h1>拼豆图片生成器</h1>
            <p>上传图片后，在浏览器本地生成带网格、色号和用量统计的拼豆图纸。</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={handleReset} type="button">
            重置
          </button>
          <button className="secondary-button" disabled={!pattern} type="button">
            下载预览
          </button>
          <button
            className="primary-button"
            disabled={!pattern || isExporting}
            onClick={handleDownloadPattern}
            type="button"
          >
            {isExporting ? "生成中" : "下载图纸"}
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="拼豆生成工作台">
        <aside className="settings-panel">
          <h2>生成设置</h2>
          <fieldset>
            <legend>生成模式</legend>
            <div className="segmented-control mode-switch">
              <label>
                <input
                  checked={creationMode === "image"}
                  name="creation-mode"
                  onChange={() => setCreationMode("image")}
                  type="radio"
                />
                <span>图片转拼豆</span>
              </label>
              <label>
                <input
                  checked={creationMode === "text"}
                  name="creation-mode"
                  onChange={() => setCreationMode("text")}
                  type="radio"
                />
                <span>文字转拼豆</span>
              </label>
            </div>
          </fieldset>
          {creationMode === "image" ? (
            <label className="upload-dropzone">
              <input
                aria-describedby="upload-status"
                aria-label="上传图片"
                accept="image/*"
                onChange={handleUpload}
                type="file"
              />
              <span>{fileName || "点击上传图片"}</span>
              <small id="upload-status">
                {isLoading ? "正在读取图片" : "支持 JPG、PNG、WebP"}
              </small>
            </label>
          ) : (
            <div className="text-settings">
              <h3>文字设置</h3>
              <label className="text-input-field">
                <span>输入文字</span>
                <textarea
                  aria-label="输入文字"
                  maxLength={8}
                  onChange={(event) => setTextInput(event.target.value)}
                  placeholder="输入 1-8 个字"
                  rows={3}
                  value={textInput}
                />
              </label>
              <fieldset>
                <legend>字体风格</legend>
                <div className="segmented-control text-style-control">
                  {TEXT_STYLE_OPTIONS.map((option) => (
                    <label key={option.value}>
                      <input
                        checked={textStyle === option.value}
                        name="text-style"
                        onChange={() => setTextStyle(option.value)}
                        type="radio"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
          {error ? (
            <p className="error-message" role="alert">
              {error}
            </p>
          ) : null}

          <div className="control-group canvas-size-control">
            <div className="control-label">
              <span>画布尺寸</span>
              <strong>
                {canvasSize.width} x {canvasSize.height}
              </strong>
            </div>
            <div className="size-preset-grid" aria-label="画布尺寸预设">
              {CANVAS_SIZE_PRESETS.map((preset) => (
                <button
                  aria-pressed={selectedPreset === preset}
                  className={`size-preset${
                    selectedPreset === preset ? " size-preset--active" : ""
                  }`}
                  key={`${preset.width}x${preset.height}`}
                  onClick={() => applyCanvasSize(preset)}
                  type="button"
                >
                  {preset.width}x{preset.height}
                </button>
              ))}
            </div>
            <div className="custom-size-row">
              <label>
                <span>宽</span>
                <input
                  aria-label="画布宽度"
                  inputMode="numeric"
                  max={CANVAS_SIZE_LIMIT.max}
                  min={CANVAS_SIZE_LIMIT.min}
                  onBlur={() =>
                    applyCanvasSize({
                      ...canvasSize,
                      width: Number(canvasWidthInput) || canvasSize.width,
                    })
                  }
                  onChange={handleCanvasWidthChange}
                  type="number"
                  value={canvasWidthInput}
                />
              </label>
              <label>
                <span>高</span>
                <input
                  aria-label="画布高度"
                  inputMode="numeric"
                  max={CANVAS_SIZE_LIMIT.max}
                  min={CANVAS_SIZE_LIMIT.min}
                  onBlur={() =>
                    applyCanvasSize({
                      ...canvasSize,
                      height: Number(canvasHeightInput) || canvasSize.height,
                    })
                  }
                  onChange={handleCanvasHeightChange}
                  type="number"
                  value={canvasHeightInput}
                />
              </label>
            </div>
          </div>

          {creationMode === "image" ? (
            <fieldset>
              <legend>取色方式</legend>
              <div className="segmented-control">
                <label>
                  <input
                    checked={sampleMode === "dominant"}
                    name="sample-mode"
                    onChange={() => setSampleMode("dominant")}
                    type="radio"
                  />
                  <span>主导色</span>
                </label>
                <label>
                  <input
                    checked={sampleMode === "average"}
                    name="sample-mode"
                    onChange={() => setSampleMode("average")}
                    type="radio"
                  />
                  <span>平均色</span>
                </label>
              </div>
            </fieldset>
          ) : null}

          <fieldset>
            <legend>色彩数量</legend>
            <div className="segmented-control">
              <label>
                <input
                  checked={paletteMode === "starter"}
                  name="palette-size"
                  onChange={() => setPaletteMode("starter")}
                  type="radio"
                />
                <span>48 色</span>
              </label>
              <label>
                <input
                  checked={paletteMode === "full"}
                  name="palette-size"
                  onChange={() => setPaletteMode("full")}
                  type="radio"
                />
                <span>全色板</span>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>图纸标记</legend>
            <label className="toggle-row">
              <input
                checked={showCodes}
                onChange={(event) => setShowCodes(event.target.checked)}
                type="checkbox"
              />
              <span>显示色号</span>
            </label>
            <label className="toggle-row">
              <input
                checked={showGrid}
                onChange={(event) => setShowGrid(event.target.checked)}
                type="checkbox"
              />
              <span>显示网格</span>
            </label>
          </fieldset>
        </aside>

        <section className="preview-panel">
          <div className="panel-heading">
            <div>
              <h2>拼豆预览</h2>
              <p>
                {creationMode === "text"
                  ? "输入文字后按当前画布尺寸生成。"
                  : "上传图片后自动生成预览。"}
              </p>
            </div>
            <div className="preview-actions">
              <button
                className="recommend-button"
                disabled={creationMode === "image" ? !imageData : !textInput.trim()}
                onClick={handleRecommendCanvasSize}
                type="button"
              >
                {creationMode === "text" ? "适配文字" : "智能推荐"}
              </button>
              <span className="preview-meta">
                {pattern
                  ? `${pattern.width} x ${pattern.height} 格`
                  : creationMode === "text"
                    ? "等待文字"
                    : "等待图片"}
              </span>
            </div>
          </div>
          <div className="preview-canvas" aria-label="拼豆预览画布">
            {pattern ? (
              <BeadGrid
                pattern={pattern}
                showCodes={showCodes}
                showGrid={showGrid}
              />
            ) : (
              <div className="empty-preview">
                <span className="empty-icon" aria-hidden="true">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <span key={index} />
                  ))}
                </span>
                <strong>还没有图纸</strong>
                <p>
                  {creationMode === "text"
                    ? "输入文字后，系统会按当前画布尺寸生成拼豆网格。"
                    : "先上传一张图片，系统会按当前参数生成拼豆网格。"}
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="stats-panel">
          <h2>色号用量</h2>
          <div className="stats-list" aria-label="色号用量列表">
            {(stats.length > 0
              ? stats
              : [
                  { code: "A1", name: "米白", count: 0, color: "#F7EFD8" },
                  { code: "K1", name: "深黑", count: 0, color: "#222222" },
                  { code: "Y2", name: "暖黄", count: 0, color: "#F3C852" },
                  { code: "R2", name: "红棕", count: 0, color: "#A94235" },
                ]
            ).map((item) => (
              <div className="stat-row" key={item.code}>
                <span
                  className="color-swatch"
                  style={{ backgroundColor: item.color }}
                />
                <span>
                  {item.code} {item.name}
                </span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
          <p className="stats-note">
            {pattern
              ? `共 ${pattern.cells.length} 颗，${stats.length} 个色号。`
              : "生成后会按用量排序，点击色号可高亮对应拼豆格。"}
          </p>
        </aside>
      </section>
    </main>
  );
}

const TEXT_STYLE_OPTIONS: Array<{ label: string; value: TextStyle }> = [
  { label: "黑体", value: "bold" },
  { label: "圆体", value: "rounded" },
  { label: "像素", value: "pixel" },
];

function getPatternFileName({
  fileName,
  mode,
  text,
}: {
  fileName: string;
  mode: CreationMode;
  text: string;
}) {
  const baseName =
    mode === "text"
      ? text.trim().slice(0, 8) || "文字"
      : fileName.replace(/\.[^.]+$/, "").trim() || "pindou";
  return `${baseName}-拼豆图纸.png`;
}

function clampCanvasDimension(value: number) {
  return Math.min(
    CANVAS_SIZE_LIMIT.max,
    Math.max(CANVAS_SIZE_LIMIT.min, Math.round(value)),
  );
}

function recommendTextCanvasSize(text: string): CanvasSize {
  const length = Math.max(1, text.trim().length);

  if (length <= 1) {
    return { width: 48, height: 48 };
  }
  if (length <= 4) {
    return { width: 80, height: 60 };
  }

  return { width: 100, height: 100 };
}

function BeadGrid({
  pattern,
  showCodes,
  showGrid,
}: {
  pattern: BeadPattern;
  showCodes: boolean;
  showGrid: boolean;
}) {
  return (
    <div
      className={`bead-grid${showGrid ? "" : " bead-grid--no-lines"}`}
      style={
        {
          "--bead-grid-width": pattern.width,
        } as CSSProperties
      }
    >
      {pattern.cells.map((cell) => (
        <span
          aria-label={`第 ${cell.x + 1} 列第 ${cell.y + 1} 行，色号 ${cell.color.code}`}
          className="bead-cell"
          key={`${cell.x}-${cell.y}`}
          style={{ backgroundColor: cell.color.hex }}
          title={`${cell.color.code} ${cell.color.name}`}
        >
          {showCodes ? cell.color.code : ""}
        </span>
      ))}
    </div>
  );
}

export default App;
