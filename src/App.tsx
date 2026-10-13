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
import "./styles.css";

type PaletteMode = "starter" | "full";

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
  const [fileName, setFileName] = useState("");
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [beadWidth, setBeadWidth] = useState(60);
  const [sampleMode, setSampleMode] = useState<SampleMode>("dominant");
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("full");
  const [showCodes, setShowCodes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const palette = paletteMode === "starter" ? starterPalette : fullPalette;
  const pattern = useMemo(
    () =>
      imageData
        ? createBeadPatternFromImageData(imageData, {
            beadWidth,
            palette,
            sampleMode,
          })
        : null,
    [beadWidth, imageData, palette, sampleMode],
  );
  const stats = pattern ? getPatternStats(pattern) : [];

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
    setError("");
  };

  const handleDownloadPattern = async () => {
    if (!pattern) {
      return;
    }

    setIsExporting(true);
    setError("");

    try {
      const blob = await patternExporter(pattern, stats, { showCodes, showGrid });
      fileDownloader(blob, getPatternFileName(fileName));
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
          {error ? (
            <p className="error-message" role="alert">
              {error}
            </p>
          ) : null}

          <div className="control-group">
            <div className="control-label">
              <span>拼豆宽度</span>
              <strong>{beadWidth} 格</strong>
            </div>
            <input
              aria-label="拼豆宽度"
              onChange={(event) => setBeadWidth(Number(event.target.value))}
              value={beadWidth}
              max={120}
              min={16}
              type="range"
            />
          </div>

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
              <p>上传图片后自动生成预览。</p>
            </div>
            <span className="preview-meta">
              {pattern ? `${pattern.width} x ${pattern.height} 格` : "等待图片"}
            </span>
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
                <p>先上传一张图片，系统会按当前参数生成拼豆网格。</p>
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

function getPatternFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "pindou";
  return `${baseName}-拼豆图纸.png`;
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
