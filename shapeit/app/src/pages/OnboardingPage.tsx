import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFeedbackRemote } from "../lib/cloudStore";
import { saveSettings, markOnboardingDone } from "../lib/demoStore";

const steps = ["プロジェクト", "Capture", "テスト投稿", "Inbox"] as const;

/** ONB-001: セットアップウィザード */
export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [project, setProject] = useState("Dogfood");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Onboarding</p>
        <h1 className="font-display mt-1 text-3xl font-bold">セットアップ</h1>
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
          <h2 className="font-semibold">Capture の置き方</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-ink/70">
            <li>アプリ内の「気づき」FAB</li>
            <li>Chrome 拡張（任意サイト）</li>
            <li>埋め込み Widget（設定に snippet）</li>
          </ul>
          <button
            type="button"
            className="mt-4 rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setStep(2)}
          >
            次へ
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
          <h2 className="font-semibold">テスト投稿</h2>
          <p className="mt-2 text-ink/60">ワンクリックでサンプルを Inbox へ送ります。</p>
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
            流れ: 投稿 → Inbox トリアージ → Board 実行 → Done → My Feedback で解決確認。
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
              Inbox を開く
            </button>
            <button
              type="button"
              className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold"
              onClick={() => {
                markOnboardingDone();
                navigate("/capture");
              }}
            >
              Capture へ
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
