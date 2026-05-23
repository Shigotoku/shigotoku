import { useState } from "react";
import { Presentation, ExternalLink, ArrowRight, Mic, Clock, Target, CheckCircle2 } from "lucide-react";

export default function PitchPracticePage() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePredekiClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    window.open("https://predeki.com", "_blank");
    setShowConfirm(false);
  };

  const tips = [
    { icon: Clock, title: "3分ピッチを練習する", desc: "エレベーターピッチ（30秒）→ 3分ピッチ → 10分プレゼンの順で練習" },
    { icon: Target, title: "聞き手を想定する", desc: "VC、エンジェル投資家、事業会社それぞれに合わせた構成を準備" },
    { icon: Mic, title: "録画して振り返る", desc: "自分のピッチを録画し、話し方・スピード・アイコンタクトを確認" },
  ];

  const checkpoints = [
    "課題の明確化：聞き手が「確かにそれは問題だ」と思えるか",
    "解決策の説明：シンプルに30秒で説明できるか",
    "市場規模：TAM/SAM/SOMの数字を覚えているか",
    "トラクション：具体的な数字（顧客数、MRR等）を提示できるか",
    "チーム紹介：なぜこのチームが解決できるかを説明できるか",
    "Ask（お願い）：調達金額と使途を明確に言えるか",
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ピッチ練習</h1>
        <p className="mt-1 text-slate-500">
          投資家向けピッチを効果的に練習し、資金調達の成功率を高めましょう。
        </p>
      </div>

      <div className="rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md">
            <Presentation className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">プレデキでピッチ練習</h2>
            <p className="mt-1 text-sm text-slate-600">
              シゴトクが提供する「プレデキ」サービスを使って、AIフィードバック付きのピッチ練習ができます。
              実際のピッチ本番に近い環境で繰り返し練習し、プレゼンスキルを向上させましょう。
            </p>
            <button
              onClick={handlePredekiClick}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 hover:shadow-lg"
            >
              <ExternalLink className="h-4 w-4" />
              プレデキでピッチ練習を始める
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">プレデキに移動しますか？</h3>
            <p className="mt-2 text-sm text-slate-600">
              外部サービス「プレデキ」のサイトに移動します。ピッチ練習やAIフィードバックをご利用いただけます。
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">ピッチ練習のコツ</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <div key={tip.title} className="rounded-xl border border-slate-200 p-4">
                <Icon className="mb-2 h-5 w-5 text-primary-600" />
                <h3 className="text-sm font-bold text-slate-900">{tip.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{tip.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">ピッチチェックリスト</h2>
        <div className="space-y-2">
          {checkpoints.map((cp, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-100 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
              <span className="text-sm text-slate-700">{cp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
