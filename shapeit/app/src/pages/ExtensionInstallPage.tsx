import { Link } from "react-router-dom";
import { ExtensionGuidePanel } from "../components/ExtensionGuidePanel";
import { chromeExtensionSupported, isAndroid, isIos, isStandalonePwa } from "../lib/device";
import { t } from "../lib/i18n";

export default function ExtensionInstallPage() {
  const desktopExt = chromeExtensionSupported();
  const standalone = isStandalonePwa();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{t("nav_extension")}</p>
        <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">
          {desktopExt ? "拡張で最速報告" : "携帯での投稿方法"}
        </h1>
        <p className="mt-2 text-sm text-ink/65">
          {desktopExt
            ? "全画面・範囲選択・スクショなしの3モード。ショートカットまたは右下 FAB から、話してすぐ送信できます（v0.4.1）。"
            : "スマートフォンでは Chrome 拡張は使えません。ホーム画面追加（PWA）＋ スクショ → 話す → 送信 が本命です。"}
        </p>
      </div>

      {desktopExt && <ExtensionGuidePanel showInstall={false} />}

      <section className="space-y-3 rounded-2xl border border-mint/30 bg-sand/40 p-4 text-sm">
        <h2 className="font-display text-lg font-semibold">アカウントと拡張の関係</h2>
        <p className="text-ink/75">
          拡張は<strong> Chrome の Google プロファイルとは別</strong>です。ShapeIt にログインしているアカウントの情報が、そのまま拡張に渡ります。
          メールで登録した場合も、そのメールで ShapeIt にログインすれば拡張は使えます。
        </p>
        <ul className="space-y-2 text-xs text-ink/65">
          <li>メール登録 → ShapeIt にメールでログイン → 拡張から投稿</li>
          <li>Google 登録（推奨）→ 同じ Google で ShapeIt にログイン → 拡張から投稿</li>
          <li>あとから Google も使いたい → 設定 → Chrome 拡張 →「Google をこのアカウントに連携」</li>
        </ul>
        <p className="text-xs text-ink/55">
          Chrome のプロフィール（仕事用 / 個人）が違うと接続情報も別になります。登録時と同じプロフィールで ShapeIt を開いてください。
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-mint/30 bg-sand/40 p-4 text-sm">
        <h2 className="font-display text-lg font-semibold">PC と携帯の役割分担</h2>
        <ul className="space-y-2 text-ink/75">
          <li>
            <span className="font-semibold text-ink">PC（Chrome）</span>
            … 拡張機能が最速。全画面・範囲選択スクショ、URL 自動取得、音声入力、FAB メニュー。
          </li>
          <li>
            <span className="font-semibold text-ink">スマートフォン</span>
            … 拡張は非対応（Android Chrome も通常の拡張ストアは使えず、iPhone の Chrome は中身が Safari/WebKit）。
            <span className="font-semibold text-ink"> PWA + スクショ → 話す → 送信</span> が正解です。
          </li>
        </ul>
      </section>

      <section className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <h2 className="font-semibold">携帯での最短フロー</h2>
        <p className="text-xs text-ink/55">
          拡張は使えません。ホーム画面追加後、スクショと音声入力で投稿します。
        </p>

        {isIos() ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-mint">iPhone / Safari</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-ink/75">
              <li>
                Safari でこのアプリを開き、共有 → <strong>ホーム画面に追加</strong>
                {standalone ? "（済）" : ""}
              </li>
              <li>気づいた画面でスクショ（電源＋音量上）</li>
              <li>ShapeIt「投稿」→ アルバム / 貼り付けでスクショ添付</li>
              <li>
                大きな「話す」ボタン、またはキーボードの🎤で一言 → 送信
              </li>
            </ol>
            <p className="mt-2 text-xs text-ink/50">
              ホーム画面アプリでは音声認識が不安定なことがあります。そのときはキーボードのマイクか「音声のまま添付」を使ってください。
            </p>
          </div>
        ) : isAndroid() ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-mint">Android</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-ink/75">
              <li>
                Chrome で「ホーム画面に追加 / インストール」
                {standalone ? "（済）" : ""}
              </li>
              <li>スクショ後、共有シートから <strong>ShapeIt</strong>（またはアルバムから添付）</li>
              <li>「話す」で端末の音声認識 → 送信</li>
            </ol>
          </div>
        ) : (
          <ol className="list-decimal space-y-2 pl-5 text-ink/75">
            <li>ブラウザのメニューからホーム画面 / アプリとして追加</li>
            <li>Capture で画像を選択 → 話す → 送信</li>
          </ol>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/capture" className="min-h-[44px] rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-white">
            今すぐ投稿
          </Link>
        </div>
      </section>

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
            <p className="font-semibold">1. 拡張をインストール</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-ink p-3 text-xs text-paper">
              cd shapeit/extension{"\n"}npm install{"\n"}npm run build
            </pre>
            <p className="mt-2 text-ink/65">
              <code className="rounded bg-sand px-1">chrome://extensions</code> → デベロッパーモード ON →
              「パッケージ化されていない拡張機能を読み込む」→{" "}
              <code className="rounded bg-sand px-1">shapeit/extension/dist</code>
            </p>
            <p className="mt-2 text-ink/65">
              または{" "}
              <a
                className="font-semibold text-mint hover:underline"
                href="/downloads/shapeit-chrome-extension.zip"
                download
              >
                拡張 zip をダウンロード
              </a>
              して解凍したフォルダを読み込みます。
            </p>
          </li>
          <li>
            <p className="font-semibold">2. ShapeIt にログイン（初回のみ）</p>
            <p className="mt-1 text-ink/65">
              登録時と同じ方法（Google またはメール）で ShapeIt を開くと、拡張へ接続情報が保存されます。
              拡張ポップアップの「ShapeIt にログイン」、または設定 → Chrome 拡張 →「拡張へ再接続」でも確認できます。
            </p>
          </li>
          <li>
            <p className="font-semibold">3. 報告する</p>
            <p className="mt-1 text-ink/65">
              ショートカット（G / S / C / F）、拡張アイコンのポップアップ、またはページ右下の緑 FAB から操作します。
              音声で話したあと確認画面で送信。詳しく編集したいときは Alt+Shift+F で注釈エディタが開きます。
            </p>
          </li>
          <li>
            <p className="font-semibold">4. 初回セットアップ（任意）</p>
            <p className="mt-1 text-ink/65">
              拡張のオプション画面（onboarding）で Slack Webhook や FAB の表示設定ができます。
              マイク許可は初回の音声入力時にブラウザが求めます。
            </p>
          </li>
        </ol>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/capture" className="min-h-[44px] rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-white">
          投稿へ
        </Link>
        <Link to="/inbox" className="min-h-[44px] rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold">
          受信箱へ
        </Link>
        <Link to="/settings?tab=extension" className="min-h-[44px] rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold">
          ログイン・拡張の設定
        </Link>
      </div>
    </div>
  );
}
