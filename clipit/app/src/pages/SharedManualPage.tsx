import { useParams } from "react-router-dom";

/**
 * 共有マニュアル閲覧（公開・認証不要 / noindex）。
 * QR・共有URL の遷移先。スマホ縦スクロール表示に最適化する。
 * 実装は Phase 1（要件定義書 §4.1 / §7.4）。
 */
export default function SharedManualPage() {
  const { token } = useParams();

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white px-5 py-8">
      <div className="flex items-center gap-2.5">
        <img src="/favicon.svg" alt="クリッピット" className="h-7 w-7" />
        <span className="text-sm font-bold tracking-tight text-slate-900">クリッピット</span>
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        共有マニュアルの閲覧ページ（スマホ縦スクロール表示）です。
        <br />
        <span className="text-xs text-slate-400">token: {token}</span>
        <br />
        <span className="text-xs text-slate-400">閲覧者はログイン・拡張機能ともに不要です。</span>
      </div>

      <button
        type="button"
        className="mt-6 w-full rounded-xl bg-success-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-success-600"
      >
        確認しました
      </button>
    </div>
  );
}
