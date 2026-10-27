import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowUp, ChevronDown, List, Printer } from "lucide-react";
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
  const [readConfirmation, setReadConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [name, setName] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [updateNotice, setUpdateNotice] = useState("");
  const [confirmVersion, setConfirmVersion] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

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
        setReadConfirmation(doc.readConfirmation ?? !doc.watermark);
        setUpdateNotice(doc.updateNotice ?? "");
        setConfirmVersion(doc.confirmationVersion ?? 1);
      })
      .catch(() => setError("読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!steps.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));
        const idx = visible[0]?.target.getAttribute("data-step-index");
        if (idx != null) setActiveIndex(Number(idx));
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: 0.1 },
    );
    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [steps]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToStep = (index: number) => {
    stepRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTocOpen(false);
  };

  const handleConfirm = async () => {
    if (!manualId || !token) return;
    await recordReadConfirmation(manualId, { viewerName: name });
    localStorage.setItem(`clipit-confirmed-${token}`, String(confirmVersion));
    setConfirmed(true);
  };

  const prevConfirmed =
    token && localStorage.getItem(`clipit-confirmed-${token}`) === String(confirmVersion);

  const sendFeedback = async (type: FeedbackType) => {
    if (!manualId) return;
    await submitFeedback(manualId, { type, viewerName: name });
    setFeedbackSent(true);
  };

  const progressPct = steps.length > 1 ? Math.round(((activeIndex + 1) / steps.length) * 100) : 100;

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
    <div className="shared-manual relative min-h-screen bg-slate-50 print:bg-white">
      {watermark && (
        <div
          className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center opacity-[0.06] print:opacity-[0.08]"
          aria-hidden
        >
          <span className="rotate-[-24deg] text-6xl font-black text-slate-900">ClipIt</span>
        </div>
      )}

      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2.5 px-5 py-3 print:max-w-none">
          <span className="clipit-icon-frame h-8 w-8 shrink-0">
            <img src="/icon.png" alt="" className="clipit-brand-icon h-full w-full object-contain" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{title}</p>
            <p className="text-[11px] text-slate-500">
              {activeIndex + 1} / {steps.length} 手順 · {progressPct}%
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTocOpen((v) => !v)}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="目次"
          >
            <List size={18} />
          </button>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {tocOpen && (
        <div className="no-print fixed inset-0 z-30 bg-black/30" onClick={() => setTocOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">目次</h2>
              <button type="button" onClick={() => setTocOpen(false)} className="text-slate-400">
                <ChevronDown size={20} />
              </button>
            </div>
            <ol className="space-y-1">
              {steps.map((s, i) => (
                <li key={`toc-${s.order}-${i}`}>
                  <button
                    type="button"
                    onClick={() => scrollToStep(i)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${
                      i === activeIndex ? "bg-primary-50 font-semibold text-primary-800" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="mr-2 text-xs text-slate-400">{i + 1}.</span>
                    {s.title || `手順 ${i + 1}`}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <div className="shared-manual-body relative mx-auto max-w-md px-5 py-6 pb-36 print:max-w-none print:pb-0">
        <div className="print-only mb-6 hidden border-b border-slate-200 pb-4 print:block">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-xs text-slate-500">{steps.length} 手順 · ClipIt</p>
        </div>

        {updateNotice && (
          <div className="no-print mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>更新がありました。</strong> {updateNotice} 内容を確認してください。
          </div>
        )}

        <h1 className="text-xl font-bold leading-snug text-slate-900 print:hidden">{title}</h1>
        <p className="mt-1 text-xs text-slate-400 print:hidden">縦スクロールで読み進めてください</p>

        <ol className="mt-8 space-y-10">
          {steps.map((s, i) => (
            <li
              key={`${s.order}-${i}`}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              data-step-index={i}
              id={`step-${i + 1}`}
              className="scroll-mt-24 break-inside-avoid print:scroll-mt-0"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white print:h-8 print:w-8">
                  {i + 1}
                </span>
                <h2 className="text-base font-bold text-slate-900">{s.title || `手順 ${i + 1}`}</h2>
              </div>
              <div className="mt-3 touch-manipulation">
                <StepScreenshotPreview
                  screenshotUrl={s.screenshotUrl}
                  stepIndex={i + 1}
                  stepType={s.type}
                  showClickMarker={false}
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
          {prevConfirmed && !confirmed && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
              この版は確認済みです。更新があれば再度「確認しました」を押してください。
            </p>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-3.5 text-sm font-semibold text-slate-700 active:bg-slate-50"
          >
            <Printer size={16} />
            印刷（A4）
          </button>
          {!feedbackSent && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold text-slate-700">わからない・画面が違う場合</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => sendFeedback("unclear")}
                  className="min-h-[44px] rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 active:bg-slate-100"
                >
                  わかりにくい
                </button>
                <button
                  type="button"
                  onClick={() => sendFeedback("screen_differs")}
                  className="min-h-[44px] rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 active:bg-slate-100"
                >
                  画面が違う
                </button>
                <button
                  type="button"
                  onClick={() => sendFeedback("request_update")}
                  className="min-h-[44px] rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 active:bg-slate-100"
                >
                  更新してほしい
                </button>
              </div>
            </div>
          )}
          {feedbackSent && <p className="text-center text-xs text-slate-500">フィードバックを送信しました</p>}
        </div>
      </div>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="no-print fixed bottom-28 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg active:scale-95"
          aria-label="ページ上部へ"
        >
          <ArrowUp size={18} />
        </button>
      )}

      <div className="no-print fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        {readConfirmation ? (
          confirmed ? (
            <p className="text-center text-sm font-semibold text-success-600">確認を記録しました。ありがとうございます。</p>
          ) : (
            <div className="mx-auto max-w-md space-y-2">
              <input
                type="text"
                placeholder="お名前（任意）"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full rounded-xl bg-success-500 px-4 py-3.5 text-sm font-semibold text-white hover:bg-success-600 active:bg-success-700"
              >
                確認しました
              </button>
            </div>
          )
        ) : (
          <p className="text-center text-xs text-slate-500">
            閲覧専用リンクです。既読確認はスタンダードプラン以上で利用できます。
          </p>
        )}
      </div>
    </div>
  );
}
