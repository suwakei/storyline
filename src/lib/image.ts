/**
 * サムネイル用の画像縮小。
 *
 * 元画像をそのまま data URL にすると IndexedDB もエクスポート JSON も
 * すぐ肥大化するので、読み込み時に必ず縮小して JPEG 化する。
 */
const MAX_EDGE = 640;
const QUALITY = 0.82;

export async function fileToThumbnail(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選んでください。");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("画像を処理できませんでした。");
  }
  // 透過 PNG を JPEG 化すると黒く落ちるので白で埋めてから描く
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", QUALITY);
}
