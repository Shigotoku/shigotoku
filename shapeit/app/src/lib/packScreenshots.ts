import type { FixPack } from "./fixPacks";
import type { Feedback } from "./types";

export interface PackScreenshot {
  feedbackId: string;
  title: string;
  authorName: string;
  src: string;
}

export function getFeedbackScreenshotSrc(fb: Feedback): string | undefined {
  return fb.screenshotUrl || fb.screenshotDataUrl;
}

export function collectPackScreenshots(pack: FixPack): PackScreenshot[] {
  const seen = new Set<string>();
  const out: PackScreenshot[] = [];
  for (const item of pack.items) {
    for (const fb of item.feedbacks) {
      const src = getFeedbackScreenshotSrc(fb);
      if (!src || seen.has(fb.id)) continue;
      seen.add(fb.id);
      out.push({
        feedbackId: fb.id,
        title: item.issue.title,
        authorName: fb.authorName || "投稿者",
        src,
      });
    }
  }
  return out;
}

export function buildScreenshotUrlList(screenshots: PackScreenshot[]): string {
  if (!screenshots.length) return "";
  return screenshots
    .map((s, i) => `${i + 1}. ${s.title}（${s.authorName}）\n   ${s.src}`)
    .join("\n");
}

export function buildScreenshotMarkdown(screenshots: PackScreenshot[]): string {
  if (!screenshots.length) return "";
  return screenshots
    .map((s, i) => `${i + 1}. **${s.title}**（${s.authorName}）\n   ![${s.title}](${s.src})`)
    .join("\n\n");
}

async function blobFromSrc(src: string): Promise<Blob> {
  if (src.startsWith("data:")) {
    const res = await fetch(src);
    return res.blob();
  }
  const res = await fetch(src, { mode: "cors" });
  if (!res.ok) throw new Error("画像の取得に失敗しました");
  return res.blob();
}

export async function copyScreenshotToClipboard(src: string) {
  const blob = await blobFromSrc(src);
  const type = blob.type.startsWith("image/") ? blob.type : "image/png";
  await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
}

export async function copyAllScreenshotsToClipboard(screenshots: PackScreenshot[]) {
  const items = await Promise.all(
    screenshots.map(async (s) => {
      const blob = await blobFromSrc(s.src);
      const type = blob.type.startsWith("image/") ? blob.type : "image/png";
      return new ClipboardItem({ [type]: blob });
    }),
  );
  await navigator.clipboard.write(items);
}

export function downloadScreenshot(s: PackScreenshot, index: number) {
  const ext = s.src.startsWith("data:image/png") ? "png" : s.src.startsWith("data:image/jpeg") ? "jpg" : "png";
  const a = document.createElement("a");
  a.href = s.src;
  a.download = `shapeit-${index + 1}-${s.feedbackId.slice(0, 8)}.${ext}`;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
}

export function downloadAllScreenshots(screenshots: PackScreenshot[]) {
  screenshots.forEach((s, i) => {
    window.setTimeout(() => downloadScreenshot(s, i), i * 200);
  });
}
