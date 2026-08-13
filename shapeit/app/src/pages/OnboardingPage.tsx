import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFeedbackRemote } from "../lib/cloudStore";
import { saveSettings, markOnboardingDone } from "../lib/demoStore";
import { t } from "../lib/i18n";

const steps = ["プロジェクト", "投稿", "テスト投稿", "受信箱"] as const;

/** ONB-001: セットアップウィザード */
export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [project, setProject] = useState("Dogfood");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{t("nav_setup")}</p>
        <h1 className="font-display mt-1 text-3xl font-bold">{t("page_setup")}</h1>
        <p className="mt-2 text-sm text-ink/60">
          ステップ {step + 1} / {steps.length}: {steps[step]}
        </p>
      </div>
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-mint" : "bg-sand"}`} />
        ))}
      </div>

      {step === 0 && (
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-semibold">Project 名</h2>
          <input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="mt-3 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="mt-4 rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              saveSettings({ environmentOverride: project || "demo" });
              setStep(1);
            }}
          >
            次へ
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
          <h2 className="font-semibold">投稿の置き方</h2>
          <div className="mt-3 space-y-3 text-ink/70">
            <div>
              <p className="font-medium text-ink">PC</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Chrome 拡張（閲覧中ページのスクショ・URL 自動）</li>
                <li>アプリ内の投稿 / 埋め込み Widget</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-ink">スマートフォン</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>ホーム画面に追加（PWA）※拡張は使えません</li>
                <li>最速: スクショ → 話す（端末の音声認識）→ 送信</li>
                <li>うまくいかないときはキーボードのマイク、または音声添付</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-[44px] rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setStep(2)}
            >
              次へ
            </button>
            <button
              type="button"
              className="min-h-[44px] rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold"
              onClick={() => navigate("/extension/install")}
            >
              詳細な使い方
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
          <h2 className="font-semibold">テスト投稿</h2>
          <p className="mt-2 text-ink/60">ワンクリックでサンプルを受信箱へ送ります。</p>
          <button
            type="button"
            disabled={busy}
            className="mt-4 rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={async () => {
              setBusy(true);
              await createFeedbackRemote({
                rawText: `【オンボーディング】${project} のテスト投稿です。保存ボタンが分かりにくい気がします。`,
                pageUrl: "https://app.example.com/onboarding",
                source: "WEB_FORM",
              });
              setBusy(false);
              setStep(3);
            }}
          >
            {busy ? "送信中…" : "テスト投稿する"}
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
          <h2 className="font-semibold">完了</h2>
          <p className="mt-2 text-ink/60">
            流れ: 投稿 → 受信箱で整理 → ボードで実行 → 完了 → 自分の投稿で解決確認。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper"
              onClick={() => {
                markOnboardingDone();
                navigate("/inbox");
              }}
            >
              受信箱を開く
            </button>
            <button
              type="button"
              className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold"
              onClick={() => {
                markOnboardingDone();
                navigate("/capture");
              }}
            >
              投稿へ
            </button>
            <button
              type="button"
              className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold"
              onClick={() => {
                markOnboardingDone();
                navigate("/my-feedback");
              }}
            >
              My Feedback へ
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
