import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StepScreenshotPreview from "../components/StepScreenshotPreview";
import { getShareByToken, recordReadConfirmation } from "../services/share";
import { submitFeedback } from "../services/feedback";
import type { ShareStepSnapshot, FeedbackType } from "../types";

export default function SharedManualPage() {
  const { token } = useParams<{ token: string }>();
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState<ShareStepSnapshot[]>([]);
  const [manualId, setManualId] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [name, setName] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    getShareByToken(token)
      .then((doc) => {
        if (!doc) {
          setError("リンクが無効か、期限切れです。");
          return;
        }
        setTitle(doc.title);
        setSteps([...doc.steps].sort((a, b) => a.order - b.order));
        setManualId(doc.manualId);
        setWatermark(Boolean(doc.watermark));
      })
      .catch(() => setError("読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleConfirm = async () => {
    if (!manualId) return;
    await recordReadConfirmation(manualId, { viewerName: name });
    setConfirmed(true);
  };

  const sendFeedback = async (type: FeedbackType) => {
    if (!manualId) return;
    await submitFeedback(manualId, { type, viewerName: name });
    setFeedbackSent(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5 py-12 text-center text-sm text-slate-600">
        {error}
      </div>
    );
  }

  return (
    <div className="shared-manual relative mx-auto min-h-screen max-w-md bg-white px-5 py-6 pb-36 print:max-w-none print:pb-0">
      {watermark && (
        <div
          className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center opacity-[0.06] print:opacity-[0.08]"
          aria-hidden
        >
          <span className="rotate-[-24deg] text-6xl font-black text-slate-900">ClipIt</span>
        </div>
      )}

      <header className="no-print flex items-center gap-2.5">
        <img src="/favicon.svg" alt="" className="h-7 w-7" />
        <span className="text-sm font-bold tracking-tight text-slate-900">クリッピット</span>
      </header>

      <h1 className="mt-6 text-xl font-bold leading-snug text-slate-900 print:mt-0">{title}</h1>
      <p className="mt-1 text-xs text-slate-400">{steps.length} 手順 · スマホは縦スクロールでご覧ください</p>

      <ol className="mt-8 space-y-10">
        {steps.map((s, i) => (
          <li key={`${s.order}-${i}`} className="scroll-mt-4 break-inside-avoid">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h2 className="text-base font-bold text-slate-900">{s.title || `手順 ${i + 1}`}</h2>
            </div>
            <div className="mt-3">
              <StepScreenshotPreview
                screenshotUrl={s.screenshotUrl}
                stepIndex={i + 1}
                clickX={s.clickX}
                clickY={s.clickY}
                stepType={s.type}
              />
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{s.instruction}</p>
            {s.note && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{s.note}</p>
            )}
            {s.type === "check" && (
              <p className="mt-2 text-xs font-semibold text-primary-700">□ ここまでできたらチェック</p>
            )}
          </li>
        ))}
      </ol>

      <div className="no-print mt-8 space-y-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700"
        >
          印刷（A4）
        </button>
        {!feedbackSent && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-700">わからない・画面が違う場合</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => sendFeedback("unclear")}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
              >
                わかりにくい
              </button>
              <button
                type="button"
                onClick={() => sendFeedback("screen_differs")}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
              >
                画面が違う
              </button>
              <button
                type="button"
                onClick={() => sendFeedback("request_update")}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
              >
                更新してほしい
              </button>
            </div>
          </div>
        )}
        {feedbackSent && <p className="text-center text-xs text-slate-500">フィードバックを送信しました</p>}
      </div>

      <div className="no-print fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        {confirmed ? (
          <p className="text-center text-sm font-semibold text-success-600">確認を記録しました。ありがとうございます。</p>
        ) : (
          <div className="mx-auto max-w-md space-y-2">
            <input
              type="text"
              placeholder="お名前（任意）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full rounded-xl bg-success-500 px-4 py-3.5 text-sm font-semibold text-white hover:bg-success-600"
            >
              確認しました
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
