import { Link } from "react-router-dom";
import { EXTENSION_SHORTCUTS, EXTENSION_VERSION } from "../lib/extensionShortcuts";
import { getLocale } from "../lib/i18n";

type Props = {
  compact?: boolean;
  showInstall?: boolean;
};

export function ExtensionGuidePanel({ compact = false, showInstall = true }: Props) {
  const locale = getLocale();
  const ja = locale === "ja";

  return (
    <div className={compact ? "space-y-3 text-sm" : "space-y-4 text-sm"}>
      <div className="rounded-xl border-2 border-mint/40 bg-mint/10 p-4">
        <h3 className="font-display text-base font-bold text-ink">
          {ja ? `キーボードショートカット（v${EXTENSION_VERSION}）` : `Keyboard shortcuts (v${EXTENSION_VERSION})`}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-ink/60">
          {ja
            ? "Chrome では Alt+文字だけだとブラウザのメニューと競合します（例: Alt+E）。Shift を挟むと安全に使えます。"
            : "On Chrome, Alt+letter alone conflicts with browser menus (e.g. Alt+E). Adding Shift avoids that."}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink/60">
          {ja
            ? "拡張を入れたら、まずこの4つを覚えてください。どの Web ページでも同じキーで報告できます。"
            : "After installing the extension, learn these four keys first. They work on any web page."}
        </p>
        <p className="mt-1 text-[11px] text-ink/50">
          {ja ? "変更: " : "Customize: "}
          <code className="rounded bg-white/80 px-1">chrome://extensions/shortcuts</code>
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-ink/10 bg-white">
          <table className="w-full min-w-[280px] text-left text-xs">
            <thead>
              <tr className="border-b border-ink/10 bg-paper/80 text-[10px] uppercase tracking-wide text-ink/50">
                <th className="px-3 py-2 font-semibold">{ja ? "キー" : "Key"}</th>
                <th className="px-3 py-2 font-semibold">{ja ? "モード" : "Mode"}</th>
                {!compact && <th className="px-3 py-2 font-semibold">{ja ? "動き" : "Flow"}</th>}
              </tr>
            </thead>
            <tbody>
              {EXTENSION_SHORTCUTS.map((row) => (
                <tr key={row.keys} className="border-b border-ink/5 last:border-0">
                  <td className="px-3 py-2.5">
                    <kbd className="rounded bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink ring-1 ring-ink/10">
                      {ja ? row.keys : row.keysMac}
                    </kbd>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-ink">
                    {ja ? row.labelJa : row.labelEn}
                  </td>
                  {!compact && (
                    <td className="px-3 py-2.5 text-ink/70">{ja ? row.hintJa : row.hintEn}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!compact && (
        <div className="rounded-xl border border-ink/10 bg-white p-4">
          <h3 className="font-semibold text-ink">{ja ? "拡張でできること" : "What the extension does"}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/75">
            <li>{ja ? "全画面・範囲選択・要素指定のスクショ" : "Full screen, region, and element capture"}</li>
            <li>{ja ? "スクショなしのコメントだけ送信（Alt + Shift + N）" : "Comment-only posts (Alt + Shift + N)"}</li>
            <li>{ja ? "音声入力（気づき欄・文字注釈）" : "Voice input for notes and text annotations"}</li>
            <li>{ja ? "右下 FAB から同じ操作をメニューで選択" : "Floating button menu on every page"}</li>
            <li>{ja ? "送信成功のぴこーん音とオーバーレイ（0.8秒）" : "Success chime and overlay (0.8s)"}</li>
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
            <li>{ja ? "対象ページで上のショートカットまたは FAB を使う" : "Use the shortcuts above or the FAB on any page"}</li>
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
