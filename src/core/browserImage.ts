export type ImageDataLoader = (file: File) => Promise<ImageData>;

export const readImageFileAsImageData: ImageDataLoader = async (file) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择 JPG、PNG 或 WebP 图片");
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("当前浏览器不支持读取图片像素");
  }

  context.drawImage(bitmap, 0, 0);
  const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();

  return imageData;
};
