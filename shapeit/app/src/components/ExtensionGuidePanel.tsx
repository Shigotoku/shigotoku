import { Link } from "react-router-dom";
import { getLocale } from "../lib/i18n";

const SHORTCUTS = [
  { keys: "Alt + Shift + G", ja: "全画面スクショ → 話す → 送信", en: "Full screen → speak → send" },
  { keys: "Alt + Shift + S", ja: "範囲選択 → 話す → 送信", en: "Region select → speak → send" },
  { keys: "Alt + Shift + C", ja: "スクショなし → 話す → 送信", en: "No screenshot → speak → send" },
  { keys: "Alt + Shift + F", ja: "範囲選択 → 詳しく編集", en: "Region select → annotate & edit" },
] as const;

type Props = {
  compact?: boolean;
  showInstall?: boolean;
};

export function ExtensionGuidePanel({ compact = false, showInstall = true }: Props) {
  const locale = getLocale();
  const ja = locale === "ja";

  return (
    <div className={compact ? "space-y-3 text-sm" : "space-y-4 text-sm"}>
      <div className="rounded-xl border border-mint/25 bg-mint/5 p-4">
        <h3 className="font-semibold text-ink">{ja ? "ショートカット（v0.4.1）" : "Shortcuts (v0.4.1)"}</h3>
        <p className="mt-1 text-xs text-ink/55">
          {ja
            ? "Chrome の拡張機能ショートカットは chrome://extensions/shortcuts でも変更できます。"
            : "Customize shortcuts at chrome://extensions/shortcuts."}
        </p>
        <ul className="mt-3 space-y-2">
          {SHORTCUTS.map((row) => (
            <li key={row.keys} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <kbd className="shrink-0 rounded bg-white px-2 py-0.5 font-mono text-[11px] text-ink shadow-sm ring-1 ring-ink/10">
                {row.keys}
              </kbd>
              <span className="text-ink/75">{ja ? row.ja : row.en}</span>
            </li>
          ))}
        </ul>
      </div>

      {!compact && (
        <div className="rounded-xl border border-ink/10 bg-white p-4">
          <h3 className="font-semibold text-ink">{ja ? "拡張でできること" : "What the extension does"}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/75">
            <li>{ja ? "全画面・範囲選択・要素指定のスクショ" : "Full screen, region, and element capture"}</li>
            <li>{ja ? "スクショなしのコメントだけ送信" : "Comment-only posts without a screenshot"}</li>
            <li>{ja ? "音声入力（気づき欄・文字注釈）" : "Voice input for notes and text annotations"}</li>
            <li>{ja ? "右下 FAB から同じ操作をメニューで選択" : "Floating button menu on every page"}</li>
            <li>{ja ? "送信成功のぴこーん音とオーバーレイ（0.8秒）" : "Success chime and overlay (0.8s)"}</li>
            <li>{ja ? "オフライン時は自動キュー、復帰後に再送" : "Offline queue with auto retry"}</li>
            <li>{ja ? "重複候補の警告（類似投稿の確認）" : "Duplicate feedback warnings"}</li>
            <li>{ja ? "任意: Slack Incoming Webhook 通知" : "Optional Slack webhook notifications"}</li>
          </ul>
        </div>
      )}

      {!compact && (
        <div className="rounded-xl border border-ink/10 bg-white p-4">
          <h3 className="font-semibold text-ink">{ja ? "接続のしかた" : "How to connect"}</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-ink/75">
            <li>
              {ja
                ? "拡張をインストール（zip または開発者モードで dist を読み込み）"
                : "Install the extension (zip or load dist in developer mode)"}
            </li>
            <li>
              {ja
                ? "ShapeIt にログイン（登録時と同じ Google またはメール）"
                : "Sign in to ShapeIt with the same Google or email you registered with"}
            </li>
            <li>
              {ja
                ? "設定 → Chrome拡張 →「拡張へ再接続」で接続を確認"
                : "Settings → Chrome extension → Reconnect to verify"}
            </li>
            <li>{ja ? "対象ページでショートカットまたは FAB を使う" : "Use shortcuts or the FAB on any page"}</li>
          </ol>
        </div>
      )}

      {showInstall && (
        <p className="text-xs text-ink/55">
          <Link to="/extension/install" className="font-semibold text-mint hover:underline">
            {ja ? "インストール手順・使い方ガイド →" : "Install steps & full guide →"}
          </Link>
        </p>
      )}
    </div>
  );
}
