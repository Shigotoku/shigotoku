export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function extractImageFromClipboardEvent(e: ClipboardEvent): Promise<string | undefined> {
  const items = e.clipboardData?.items;
  if (!items) return undefined;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return fileToDataUrl(file);
    }
  }
  return undefined;
}

export async function readClipboardImage(): Promise<string | undefined> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      return fileToDataUrl(new File([blob], "clip.png", { type }));
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function consumeShareIntake(): Promise<{
  imageDataUrl?: string;
  text?: string;
  title?: string;
  url?: string;
} | null> {
  try {
    const raw = sessionStorage.getItem("shapeit:share");
    if (!raw) return null;
    sessionStorage.removeItem("shapeit:share");
    return JSON.parse(raw) as { imageDataUrl?: string; text?: string; title?: string; url?: string };
  } catch {
    return null;
  }
}
