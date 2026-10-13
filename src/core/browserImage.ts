export type ImageDataLoader = (file: File) => Promise<ImageData>;

const MAX_IMAGE_DATA_EDGE = 512;

export const readImageFileAsImageData: ImageDataLoader = async (file) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择 JPG、PNG 或 WebP 图片");
  }

  const bitmap = await createImageBitmap(file);
  const size = getConstrainedImageSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("当前浏览器不支持读取图片像素");
  }

  context.drawImage(bitmap, 0, 0, size.width, size.height);
  const imageData = context.getImageData(0, 0, size.width, size.height);
  bitmap.close();

  return imageData;
};

export function getConstrainedImageSize(width: number, height: number) {
  const maxEdge = Math.max(width, height);

  if (maxEdge <= MAX_IMAGE_DATA_EDGE) {
    return { width, height };
  }

  const scale = MAX_IMAGE_DATA_EDGE / maxEdge;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
