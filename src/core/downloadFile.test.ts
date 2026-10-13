import { describe, expect, it, vi } from "vitest";
import { downloadBlobAsFile } from "./downloadFile";

describe("downloadBlobAsFile", () => {
  it("creates an object url and clicks a temporary download link", () => {
    const appendChild = vi.spyOn(document.body, "appendChild");
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const remove = vi.spyOn(Element.prototype, "remove").mockImplementation(
      () => undefined,
    );
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:pattern");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(
      () => undefined,
    );

    const blob = new Blob(["png"], { type: "image/png" });

    downloadBlobAsFile(blob, "pattern.png");

    const link = appendChild.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.href).toBe("blob:pattern");
    expect(link.download).toBe("pattern.png");
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:pattern");

    appendChild.mockRestore();
    click.mockRestore();
    remove.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});
