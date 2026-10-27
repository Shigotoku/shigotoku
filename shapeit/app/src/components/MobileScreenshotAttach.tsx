import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, ImagePlus, Share2 } from "lucide-react";
import {
  extractImageFromClipboardEvent,
  fileToDataUrl,
  readClipboardImage,
} from "../lib/shareIntake";
import { isAndroid, isIos, isStandalonePwa } from "../lib/device";

type Props = {
  screenshotDataUrl?: string;
  onChange: (dataUrl: string | undefined) => void;
  onAnnotate?: () => void;
};

/**
 * モバイル向けスクショ添付 UI
 * - アルバム / カメラ
 * - クリップボード貼り付け（Safari のスクショ直後に特に有効）
 * - Android PWA の共有ターゲット案内
 */
export default function MobileScreenshotAttach({ screenshotDataUrl, onChange, onAnnotate }: Props) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pasteZoneRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pasteArmed, setPasteArmed] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    onChange(await fileToDataUrl(file));
    setHint(null);
    setPasteArmed(false);
  };

  useEffect(() => {
    if (!pasteArmed) return;
    const onPaste = (e: ClipboardEvent) => {
      void extractImageFromClipboardEvent(e).then((url) => {
        if (!url) return;
        e.preventDefault();
        onChange(url);
        setHint("クリップボードの画像を添付しました");
        setPasteArmed(false);
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [pasteArmed, onChange]);

  const tryClipboard = async () => {
    setHint(null);
    const fromApi = await readClipboardImage();
    if (fromApi) {
      onChange(fromApi);
      setHint("クリップボードの画像を添付しました");
      return;
    }
    // iOS Safari 等: Clipboard API 不可 → 貼り付け待機モード
    setPasteArmed(true);
    setHint(
      isIos()
        ? "スクショ後、ここを長押しして「ペースト」するか、Ctrl/⌘+V 相当で貼り付けてください"
        : "画像をコピーしたあと、この画面でペースト（Ctrl/⌘+V）してください",
    );
    pasteZoneRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">スクリーンショット</span>
        {screenshotDataUrl && (
          <button
            type="button"
            className="text-xs text-ink/50"
            onClick={() => {
              onChange(undefined);
              setHint(null);
            }}
          >
            削除
          </button>
        )}
      </div>

      {!screenshotDataUrl ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            type="button"
            className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink/20 bg-white px-2 py-3 text-xs font-semibold text-ink/80 active:bg-sand"
            onClick={() => libraryRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5 text-mint" aria-hidden />
            アルバムから
          </button>
          <button
            type="button"
            className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink/20 bg-white px-2 py-3 text-xs font-semibold text-ink/80 active:bg-sand"
            onClick={() => cameraRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5 text-mint" aria-hidden />
            撮影する
          </button>
          <button
            type="button"
            className="col-span-2 flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-mint/40 bg-sand/40 px-2 py-3 text-xs font-semibold text-ink/80 active:bg-sand sm:col-span-1"
            onClick={() => void tryClipboard()}
          >
            <ClipboardPaste className="h-5 w-5 text-mint" aria-hidden />
            貼り付け
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <img
            src={screenshotDataUrl}
            alt="添付プレビュー"
            className="max-h-56 w-full rounded-xl border border-ink/10 object-contain bg-white"
          />
          <div className="flex flex-wrap gap-2">
            {onAnnotate && (
              <button
                type="button"
                className="min-h-[44px] rounded-xl border border-ink/15 px-4 text-xs font-semibold"
                onClick={onAnnotate}
              >
                注釈を付ける
              </button>
            )}
            <button
              type="button"
              className="min-h-[44px] rounded-xl border border-ink/15 px-4 text-xs font-semibold"
              onClick={() => libraryRef.current?.click()}
            >
              差し替え
            </button>
          </div>
        </div>
      )}

      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />

      {pasteArmed && (
        <div
          ref={pasteZoneRef}
          tabIndex={0}
          role="textbox"
          aria-label="画像をここに貼り付け"
          className="rounded-xl border-2 border-dashed border-mint bg-sand/50 px-3 py-6 text-center text-xs text-ink/70 outline-none focus:border-mint-bright"
          onPaste={(e) => {
            void extractImageFromClipboardEvent(e.nativeEvent).then((url) => {
              if (!url) return;
              e.preventDefault();
              onChange(url);
              setHint("クリップボードの画像を添付しました");
              setPasteArmed(false);
            });
          }}
        >
          ここに画像をペースト
        </div>
      )}

      {hint && <p className="text-xs text-ink/60">{hint}</p>}

      <div className="rounded-xl bg-sand/70 px-3 py-2.5 text-[11px] leading-relaxed text-ink/60">
        {isIos() ? (
          <>
            <p className="font-semibold text-ink/75">iPhone / Safari</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>対象画面でスクショ（電源＋音量上）</li>
              <li>「アルバムから」で写真を選ぶか、「貼り付け」</li>
              <li>一言書いて送信</li>
            </ol>
          </>
        ) : isAndroid() ? (
          <>
            <p className="font-semibold text-ink/75">Android</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>スクショ後、共有シートから ShapeIt を選ぶ（ホーム追加後）</li>
              <li>または「アルバムから」で添付</li>
            </ol>
            {isStandalonePwa() && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-mint">
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                共有ターゲット有効（PWA インストール済）
              </p>
            )}
          </>
        ) : (
          <p>画像はドラッグ＆ドロップ、ファイル選択、または Ctrl/⌘+V でも添付できます。</p>
        )}
      </div>
    </div>
  );
}
