import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App", () => {
  const imageData = {
    width: 4,
    height: 2,
    colorSpace: "srgb",
    data: new Uint8ClampedArray([
      217, 74, 56, 255, 217, 74, 56, 255, 52, 102, 184, 255, 52, 102, 184,
      255, 217, 74, 56, 255, 217, 74, 56, 255, 52, 102, 184, 255, 52, 102,
      184, 255,
    ]),
  } as ImageData;

  it("renders the perler bead generator workbench shell", () => {
    const { container } = render(<App />);

    expect(
      screen.getByRole("heading", { name: "拼豆图片生成器" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("上传图片")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "生成设置" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "拼豆预览" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "色号用量" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "下载图纸" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "智能推荐" }),
    ).toBeDisabled();
    expect(container.querySelectorAll(".empty-icon span")).toHaveLength(9);
  });

  it("generates a bead preview and color stats after image upload", async () => {
    const user = userEvent.setup();
    const imageDataLoader = vi.fn(async () => imageData);

    render(<App imageDataLoader={imageDataLoader} />);

    await user.upload(
      screen.getByLabelText("上传图片"),
      new File(["image"], "demo.png", { type: "image/png" }),
    );

    expect(await screen.findByText("demo.png")).toBeInTheDocument();
    expect(await screen.findByText("40 x 40 格")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^第 \d+ 列第 \d+ 行，色号/)).toHaveLength(
      1600,
    );
    expect(screen.getByText(/正红/)).toBeInTheDocument();
    expect(screen.getByText(/蓝/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载图纸" })).toBeEnabled();
  });

  it("updates the bead canvas size from presets and custom inputs", async () => {
    const user = userEvent.setup();
    const imageDataLoader = vi.fn(async () => imageData);

    render(<App imageDataLoader={imageDataLoader} />);

    await user.upload(
      screen.getByLabelText("上传图片"),
      new File(["image"], "demo.png", { type: "image/png" }),
    );

    await user.click(screen.getByRole("button", { name: "80x60" }));

    expect(await screen.findByText("80 x 60 格")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("画布宽度"));
    await user.type(screen.getByLabelText("画布宽度"), "40");
    await user.clear(screen.getByLabelText("画布高度"));
    await user.type(screen.getByLabelText("画布高度"), "40");

    expect(await screen.findByText("40 x 40 格")).toBeInTheDocument();
  });

  it("recommends a canvas size from the uploaded image", async () => {
    const user = userEvent.setup();
    const imageDataLoader = vi.fn(async () => imageData);

    render(<App imageDataLoader={imageDataLoader} />);

    await user.upload(
      screen.getByLabelText("上传图片"),
      new File(["image"], "demo.png", { type: "image/png" }),
    );

    await user.click(screen.getByRole("button", { name: "智能推荐" }));

    expect(await screen.findByText("80 x 60 格")).toBeInTheDocument();
    expect(screen.getByLabelText("画布宽度")).toHaveValue(80);
    expect(screen.getByLabelText("画布高度")).toHaveValue(60);
  });

  it("exports and downloads a png pattern after clicking download", async () => {
    const user = userEvent.setup();
    const pngBlob = new Blob(["png"], { type: "image/png" });
    const imageDataLoader = vi.fn(async () => imageData);
    const patternExporter = vi.fn(async () => pngBlob);
    const fileDownloader = vi.fn();

    render(
      <App
        fileDownloader={fileDownloader}
        imageDataLoader={imageDataLoader}
        patternExporter={patternExporter}
      />,
    );

    await user.upload(
      screen.getByLabelText("上传图片"),
      new File(["image"], "demo.png", { type: "image/png" }),
    );
    await user.click(await screen.findByRole("button", { name: "下载图纸" }));

    expect(patternExporter).toHaveBeenCalledWith(
      expect.objectContaining({ width: 40, height: 40 }),
      expect.any(Array),
      { showCodes: true, showGrid: true },
    );
    expect(fileDownloader).toHaveBeenCalledWith(pngBlob, "demo-拼豆图纸.png");
  });

  it("generates a bead preview from text using the optional canvas size", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("radio", { name: "文字转拼豆" }));
    await user.clear(screen.getByLabelText("输入文字"));
    await user.type(screen.getByLabelText("输入文字"), "福");
    await user.click(screen.getByRole("button", { name: "48x48" }));

    expect(await screen.findByText("48 x 48 格")).toBeInTheDocument();
    expect(screen.getByText("文字设置")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^第 \d+ 列第 \d+ 行，色号/)).toHaveLength(
      2304,
    );
    expect(screen.getByRole("button", { name: "下载图纸" })).toBeEnabled();
  });
});
