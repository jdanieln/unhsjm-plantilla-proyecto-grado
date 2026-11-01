export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const OUTPUT_SIZE = 900;

export type CropCenter = { x: number; y: number };

export function cropBounds(width: number, height: number, zoom: number, center: CropCenter) {
  const side = Math.min(width, height) / zoom;
  return {
    x: Math.max(0, Math.min(width - side, center.x * width - side / 2)),
    y: Math.max(0, Math.min(height - side, center.y * height - side / 2)),
    side,
  };
}

export function moveCropCenter(
  width: number,
  height: number,
  zoom: number,
  center: CropCenter,
  deltaX: number,
  deltaY: number,
): CropCenter {
  const side = Math.min(width, height) / zoom;
  const x = center.x - (deltaX * side) / width;
  const y = center.y - (deltaY * side) / height;
  return {
    x: Math.max(side / (2 * width), Math.min(1 - side / (2 * width), x)),
    y: Math.max(side / (2 * height), Math.min(1 - side / (2 * height), y)),
  };
}

export function drawSquareCrop(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  size: number,
  zoom: number,
  center: CropCenter,
) {
  const { x, y, side } = cropBounds(bitmap.width, bitmap.height, zoom, center);
  context.clearRect(0, 0, size, size);
  context.drawImage(bitmap, x, y, side, side, 0, 0, size, size);
}
