export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
};

export async function cropDataUrl(dataUrl: string, rect: CropRect): Promise<string> {
  const dpr = rect.devicePixelRatio || 1;
  const sx = Math.max(0, Math.round(rect.x * dpr));
  const sy = Math.max(0, Math.round(rect.y * dpr));
  const sw = Math.max(1, Math.round(rect.width * dpr));
  const sh = Math.max(1, Math.round(rect.height * dpr));

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  bitmap.close();

  const out = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
  return blobToDataUrl(out);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const type = blob.type || "application/octet-stream";
    return `data:${type};base64,${btoa(binary)}`;
  });
}
