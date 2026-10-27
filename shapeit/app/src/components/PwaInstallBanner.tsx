import { useEffect, useState } from "react";
import { Share, Smartphone } from "lucide-react";
import { isIos, isSafari, isStandalonePwa } from "../lib/device";

/** CAP-012: PWA インストール導線（Android beforeinstallprompt + iOS Safari 手順） */
export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [hidden, setHidden] = useState(() => localStorage.getItem("shapeit:pwa-dismiss") === "1");
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalonePwa()) {
      setHidden(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
      setDeferred({
        prompt: async () => {
          await ev.prompt();
          await ev.userChoice;
          setDeferred(null);
        },
      });
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS Safari は beforeinstallprompt 非対応 → 手動手順を出す
    if ((isIos() || isSafari()) && !localStorage.getItem("shapeit:pwa-dismiss")) {
      const t = window.setTimeout(() => setShowIosHint(true), 1200);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismiss = () => {
    localStorage.setItem("shapeit:pwa-dismiss", "1");
    setHidden(true);
    setShowIosHint(false);
    setDeferred(null);
  };

  if (hidden) return null;

  if (deferred) {
    return (
      <div
        className="fixed left-3 right-3 z-50 mx-auto max-w-sm rounded-2xl border border-ink/10 bg-white p-4 text-sm shadow-lg lg:left-auto lg:right-4"
        style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
      >
        <p className="flex items-center gap-2 font-semibold">
          <Smartphone className="h-4 w-4 text-mint" aria-hidden />
          ShapeIt をホーム画面に追加
        </p>
        <p className="mt-1 text-xs text-ink/60">
          アプリのように起動でき、スクショ共有からの投稿もスムーズになります。
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="min-h-[40px] rounded-xl bg-mint px-3 py-1.5 text-xs font-semibold text-white"
            onClick={() => void deferred.prompt()}
          >
            インストール
          </button>
          <button type="button" className="min-h-[40px] rounded-xl border border-ink/15 px-3 py-1.5 text-xs" onClick={dismiss}>
            後で
          </button>
        </div>
      </div>
    );
  }

  if (!showIosHint) return null;

  return (
    <div
      className="fixed left-3 right-3 z-50 mx-auto max-w-sm rounded-2xl border border-ink/10 bg-white p-4 text-sm shadow-lg lg:left-auto lg:right-4"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
    >
      <p className="flex items-center gap-2 font-semibold">
        <Share className="h-4 w-4 text-mint" aria-hidden />
        Safari でホーム画面に追加
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-ink/65">
        <li>
          下部（または上部）の <span className="font-semibold text-ink">共有</span> ボタンをタップ
        </li>
        <li>
          <span className="font-semibold text-ink">ホーム画面に追加</span> を選ぶ
        </li>
        <li>アイコンから ShapeIt を開いて投稿</li>
      </ol>
      <p className="mt-2 text-[11px] text-ink/50">
        ※ iPhone の Chrome でも中身は Safari（WebKit）です。拡張機能は使えません。PWA が携帯の本命です。
      </p>
      <button type="button" className="mt-3 min-h-[40px] w-full rounded-xl border border-ink/15 text-xs font-semibold" onClick={dismiss}>
        閉じる
      </button>
    </div>
  );
}
