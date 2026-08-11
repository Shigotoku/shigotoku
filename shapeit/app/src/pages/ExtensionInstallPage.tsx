import { Link } from "react-router-dom";
import { chromeExtensionSupported, isAndroid, isIos, isStandalonePwa } from "../lib/device";

export default function ExtensionInstallPage() {
  const desktopExt = chromeExtensionSupported();
  const standalone = isStandalonePwa();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Capture channels</p>
        <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">
          {desktopExt ? "拡張で最速報告" : "携帯での投稿方法"}
        </h1>
        <p className="mt-2 text-sm text-ink/65">
          {desktopExt
            ? "対象サービスを Chrome で開いたまま、アイコンクリック（または Alt+Shift+F）→ 一言 → 送信。スクショと URL は自動です。"
            : "スマートフォンでは Chrome 拡張は使えません。ホーム画面追加（PWA）＋スクショ添付が本命です。"}
        </p>
      </div>

      {/* モバイル戦略の説明 */}
      <section className="space-y-3 rounded-2xl border border-mint/30 bg-sand/40 p-4 text-sm">
        <h2 className="font-display text-lg font-semibold">PC と携帯の役割分担</h2>
        <ul className="space-y-2 text-ink/75">
          <li>
            <span className="font-semibold text-ink">PC（Chrome）</span>
            … 拡張機能が最速。閲覧中ページのスクショ・URL を自動取得。
          </li>
          <li>
            <span className="font-semibold text-ink">スマートフォン</span>
            … 拡張は非対応（Android Chrome も通常の拡張ストアは使えず、iPhone の Chrome は中身が Safari/WebKit）。
            <span className="font-semibold text-ink"> PWA + アルバム / 貼り付け / 共有</span> が正解です。
          </li>
        </ul>
      </section>

      {!desktopExt && (
        <section className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5 text-sm">
          <h2 className="font-semibold">携帯での最短フロー</h2>

          {isIos() && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-mint">iPhone / Safari</p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-ink/75">
                <li>
                  Safari でこのアプリを開き、共有 → <strong>ホーム画面に追加</strong>
                  {standalone ? "（済）" : ""}
                </li>
                <li>気づいた画面でスクショ（電源＋音量上）</li>
                <li>ShapeIt の「投稿」→「アルバムから」または「貼り付け」</li>
                <li>一言書いて送信</li>
              </ol>
              <p className="mt-2 text-xs text-ink/50">
                Safari 以外のブラウザ（Chrome 含む）でも、iOS 上では WebKit のため拡張は入りません。ホーム追加は Safari が確実です。
              </p>
            </div>
          )}

          {isAndroid() && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-mint">Android</p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-ink/75">
                <li>
                  Chrome で「ホーム画面に追加 / インストール」
                  {standalone ? "（済）" : ""}
                </li>
                <li>スクショ後、共有シートから <strong>ShapeIt</strong> を選ぶと Capture が開きます</li>
                <li>またはアプリ内「アルバムから」で添付</li>
              </ol>
            </div>
          )}

          {!isIos() && !isAndroid() && (
            <ol className="list-decimal space-y-2 pl-5 text-ink/75">
              <li>ブラウザのメニューからホーム画面 / アプリとして追加</li>
              <li>Capture で画像を選択またはペースト</li>
            </ol>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Link to="/capture" className="min-h-[44px] rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-white">
              今すぐ投稿
            </Link>
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-mint/30 bg-sand/50 p-4 text-sm text-ink/75">
        <p className="font-semibold">デモだけで試す場合</p>
        <p className="mt-1 text-xs text-ink/60">
          拡張なしでもアプリ内 Capture・ボトムナビの投稿タブで同じ流れを再現できます。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/capture" className="rounded-lg bg-mint px-3 py-1.5 text-xs font-semibold text-white">
            Capture を開く
          </Link>
          <Link to="/settings" className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold">
            Widget snippet
          </Link>
        </div>
      </div>

      {desktopExt && (
        <ol className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5 text-sm">
          <li>
            <p className="font-semibold">1. 拡張をビルド</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-ink p-3 text-xs text-paper">
              cd shapeit/extension{"\n"}npm install{"\n"}npm run build
            </pre>
          </li>
          <li>
            <p className="font-semibold">2. Chrome に読み込む</p>
            <p className="mt-1 text-ink/65">
              <code className="rounded bg-sand px-1">chrome://extensions</code> → デベロッパーモード ON →
              「パッケージ化されていない拡張機能を読み込む」→{" "}
              <code className="rounded bg-sand px-1">shapeit/extension/dist</code>
            </p>
          </li>
          <li>
            <p className="font-semibold">3. ShapeIt アプリを開く</p>
            <p className="mt-1 text-ink/65">
              デモ開始またはログインした状態でこのアプリを開くと、拡張がアプリ URL を記憶します。
            </p>
          </li>
          <li>
            <p className="font-semibold">4. 対象サイトで報告</p>
            <p className="mt-1 text-ink/65">ツールバーの ShapeIt → 気づきを書いて送信。Inbox に入ります。</p>
          </li>
        </ol>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/capture" className="min-h-[44px] rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-white">
          Capture へ
        </Link>
        <Link to="/inbox" className="min-h-[44px] rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold">
          Inbox へ
        </Link>
      </div>
    </div>
  );
}
