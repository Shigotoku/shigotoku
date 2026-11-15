import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type SlidePage = { index: number; dataUrl: string; text: string };

/**
 * PDF をブラウザ内だけで読み込み、各ページを画像化＆テキスト抽出する。
 * ファイルはサーバーへ送らない。
 */
export async function loadPdf(file: File, scale = 1.4): Promise<SlidePage[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: SlidePage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    const content = await page.getTextContent();
    const text = content.items.map((it) => ("str" in it ? it.str : "")).join(" ").trim();
    pages.push({ index: i, dataUrl: canvas.toDataURL("image/jpeg", 0.8), text });
  }
  return pages;
}
