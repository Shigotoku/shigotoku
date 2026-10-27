import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, ChevronRight, ImageUp, Chrome, ListOrdered } from "lucide-react";
import { pingExtension } from "../lib/extensionBridge";

const KEY = "clipit_onboarding_v2_done";

type Step = "welcome" | "choose" | "extension";

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [extOk, setExtOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    setOpen(true);
    pingExtension().then(setExtOk);
  }, []);

  if (!open) return null;

  const finish = () => {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={finish}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          aria-label="閉じる"
        >
          <X size={18} />
        </button>

        {step === "welcome" && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-primary-600">はじめての方へ</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">3分で最初のマニュアルを作りましょう</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              難しい設定は不要です。いちばん簡単な方法から始められます。
            </p>
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 text-sm font-semibold text-white hover:bg-primary-600"
            >
              作り方を選ぶ
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {step === "choose" && (
          <>
            <h2 className="text-lg font-bold text-slate-900">どれから始めますか？</h2>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  finish();
                  navigate("/manuals/new/screenshots");
                }}
                className="flex w-full items-start gap-3 rounded-xl border-2 border-primary-300 bg-primary-50/50 p-4 text-left hover:bg-primary-50"
              >
                <ImageUp className="mt-0.5 shrink-0 text-primary-600" size={22} />
                <div>
                  <p className="text-sm font-bold text-slate-900">スクショから作る（おすすめ・初回）</p>
                  <p className="mt-1 text-xs text-slate-600">拡張不要。画像を選ぶだけですぐ試せます。</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setStep("extension")}
                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-primary-200"
              >
                <Chrome className="mt-0.5 shrink-0 text-primary-600" size={22} />
                <div>
                  <p className="text-sm font-bold text-slate-900">操作を記録して作る</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Chrome拡張が必要です。{extOk ? "✓ 拡張を検出しました" : "初回はインストール手順を案内します"}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  finish();
                  navigate("/templates");
                }}
                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-primary-200"
              >
                <ListOrdered className="mt-0.5 shrink-0 text-slate-500" size={22} />
                <div>
                  <p className="text-sm font-bold text-slate-900">テンプレートから始める</p>
                  <p className="mt-1 text-xs text-slate-600">よくある業務の型からコピーして編集。</p>
                </div>
              </button>
            </div>
          </>
        )}

        {step === "extension" && (
          <>
            <h2 className="text-lg font-bold text-slate-900">Chrome拡張のセットアップ</h2>
            <p className="mt-2 text-sm text-slate-600">
              {extOk
                ? "拡張は準備OKです。マニュアルを作成して「拡張と連携」から記録を始めましょう。"
                : "初回のみ約3分。画面どおりに進めれば大丈夫です。"}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {!extOk && (
                <Link
                  to="/extension/install"
                  onClick={finish}
                  className="rounded-xl bg-primary-500 py-3 text-center text-sm font-semibold text-white hover:bg-primary-600"
                >
                  インストール手順を見る
                </Link>
              )}
              <Link
                to="/manuals/new/record"
                onClick={finish}
                className="rounded-xl border border-slate-300 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {extOk ? "記録でマニュアルを作る" : "とばしてマニュアルを作成"}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
