import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Chrome, Download, Puzzle, MousePointerClick } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { pingExtension } from "../lib/extensionBridge";

const STEPS = [
  {
    n: 1,
    title: "Chrome ブラウザを使う",
    body: "操作記録は Google Chrome 専用です（PC）。Edge / Firefox では動きません。",
  },
  {
    n: 2,
    title: "拡張機能ファイルを入手",
    body: "Zip をダウンロードして解凍するか、開発者の方はリポジトリの clipit/extension/dist フォルダを使います。",
  },
  {
    n: 3,
    title: "Chrome に読み込む",
    body: "chrome://extensions を開く → デベロッパーモード ON →「パッケージ化されていない拡張機能を読み込む」→ dist フォルダを選択。",
  },
  {
    n: 4,
    title: "アプリで連携して記録",
    body: "マニュアル編集画面の「拡張と連携」→ 業務サイトのタブで拡張から「記録開始」。",
  },
];

export default function ExtensionInstallPage() {
  const [detected, setDetected] = useState<boolean | null>(null);

  useEffect(() => {
    pingExtension().then(setDetected);
  }, []);

  return (
    <>
      <PageHeader
        title="Chrome拡張のインストール"
        description="操作記録を使うための設定（初回のみ・約3分）"
      />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div
          className={`rounded-2xl border p-5 ${
            detected === true
              ? "border-success-200 bg-success-50"
              : detected === false
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <Puzzle className="text-primary-600" size={22} />
            <p className="text-sm font-bold text-slate-900">拡張の状態</p>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            {detected === null && "確認中…"}
            {detected === true && "✓ 拡張が検出されました。マニュアル編集画面から「拡張と連携」できます。"}
            {detected === false &&
              "拡張がまだ検出されていません。下の手順どおりインストール後、このページを再読み込みしてください。"}
          </p>
          {detected === false && (
            <button
              type="button"
              onClick={() => pingExtension().then(setDetected)}
              className="mt-3 text-sm font-semibold text-primary-600 hover:underline"
            >
              再チェック
            </button>
          )}
        </div>

        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
                {s.n}
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{s.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-5">
          <div className="flex items-center gap-2">
            <Chrome size={20} className="text-primary-600" />
            <h2 className="text-sm font-bold text-slate-900">拡張機能パッケージ</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Chrome ウェブストア公開準備中です。今は zip 配布または開発者モードでの読み込みをご利用ください。
          </p>
          <a
            href="/extension/clipit-extension.zip"
            download
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-600"
          >
            <Download size={16} />
            拡張機能をダウンロード（zip）
          </a>
          <p className="mt-2 text-xs text-slate-500">
            解凍後の <code className="rounded bg-white px-1">dist</code> フォルダを Chrome に読み込んでください。
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <MousePointerClick size={18} className="text-primary-600" />
            拡張なしで始める場合
          </div>
          <p className="mt-2 text-sm text-slate-600">
            スクショをアップロードする方法なら、拡張なしですぐ試せます。
          </p>
          <Link
            to="/manuals/new/screenshots"
            className="mt-3 inline-block text-sm font-semibold text-primary-600 hover:underline"
          >
            スクショから作る →
          </Link>
        </div>

        <Link
          to="/manuals/new/record"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <CheckCircle2 size={16} />
          インストール済み — 記録でマニュアルを作る
        </Link>
      </div>
    </>
  );
}
