import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  createFeedbackRemote,
  listIssuesRemote,
  listMyFeedbackRemote,
  mergeIntoIssueRemote,
} from "../lib/cloudStore";
import {
  ackPendingReports,
  pingExtension,
  pullPendingReports,
  publishAppBaseToExtension,
} from "../lib/extensionBridge";
import { findDuplicateCandidates } from "../lib/duplicates";
import { clearQueueItem, enqueueOffline, loadQueue } from "../lib/offlineQueue";
import VoiceInputButton from "../components/VoiceInputButton";
import ScreenshotAnnotator from "../components/ScreenshotAnnotator";
import MobileScreenshotAttach from "../components/MobileScreenshotAttach";
import { APP_VERSION, detectEnvironment } from "../lib/meta";
import { loadSettings } from "../lib/demoStore";
import { detectPii, maskPii } from "../lib/privacy";
import { checkCaptureRateLimit } from "../lib/rateLimit";
import { canCapture } from "../lib/roles";
import type { Feedback, FeedbackSource, Issue } from "../lib/types";
import { t } from "../lib/i18n";
import {
  chromeExtensionSupported,
  isMobileUi,
  isNarrowViewport,
  isStandalonePwa,
} from "../lib/device";
import {
  consumeShareIntake,
  extractImageFromClipboardEvent,
  fileToDataUrl,
} from "../lib/shareIntake";

export default function CapturePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [rawText, setRawText] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | undefined>();
  const [annotateOpen, setAnnotateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [extOk, setExtOk] = useState<boolean | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [offlineCount, setOfflineCount] = useState(0);
  const [audioDataUrl, setAudioDataUrl] = useState<string | undefined>();
  const [recording, setRecording] = useState(false);
  const [attachConsole, setAttachConsole] = useState(false);
  const [captureSource, setCaptureSource] = useState<FeedbackSource>("APP_WIDGET");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const desktopFileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mobile = isMobileUi() || isNarrowViewport();

  const piiHits = detectPii(rawText);

  const dups = useMemo(
    () =>
      rawText.trim().length >= 4
        ? findDuplicateCandidates(rawText, issues, allFeedback)
        : [],
    [rawText, issues, allFeedback],
  );

  useEffect(() => {
    publishAppBaseToExtension();
    if (chromeExtensionSupported()) {
      void pingExtension().then(setExtOk);
    } else {
      setExtOk(false);
    }
    void listIssuesRemote().then(setIssues);
    void listMyFeedbackRemote().then(setAllFeedback);
    setOfflineCount(loadQueue().length);

    const flush = async () => {
      if (!navigator.onLine) return;
      const q = loadQueue();
      for (const item of q) {
        try {
          await createFeedbackRemote(item);
          clearQueueItem(item.id);
        } catch {
          break;
        }
      }
      setOfflineCount(loadQueue().length);
    };
    void flush();
    window.addEventListener("online", flush);

    const fromExt = params.get("ext") === "1";
    const fromShare = params.get("share") === "1";
    const qpUrl = params.get("pageUrl");
    const qpTitle = params.get("pageTitle");

    if (fromShare) {
      void consumeShareIntake().then((shared) => {
        if (!shared) {
          setInfo("共有データが見つかりませんでした。アルバムから画像を選んでください。");
          return;
        }
        if (shared.imageDataUrl) setScreenshotDataUrl(shared.imageDataUrl);
        if (shared.text) setRawText((prev) => prev || shared.text || "");
        if (shared.title) setPageTitle((prev) => prev || shared.title || "");
        if (shared.url) setPageUrl((prev) => prev || shared.url || "");
        setCaptureSource("SHARE_TARGET");
        setInfo("共有されたスクショを取り込みました。内容を書いて送信してください。");
      });
    }

    if (!fromExt) {
      if (!fromShare) {
        setPageUrl(qpUrl || (mobile ? "" : window.location.href));
        setPageTitle(qpTitle || (mobile ? "" : document.title));
      }
      return () => window.removeEventListener("online", flush);
    }

    void (async () => {
      setInfo("拡張の報告キューを取り込み中…");
      const reports = await pullPendingReports();
      if (!reports.length) {
        setInfo("取り込む報告がありません。拡張ポップアップから報告してください。");
        return;
      }
      const [latest, ...rest] = reports;
      setRawText(latest.rawText || "");
      setPageUrl(latest.pageUrl || "");
      setPageTitle(latest.pageTitle || "");
      setScreenshotDataUrl(latest.screenshotDataUrl);
      setCaptureSource("CHROME_EXTENSION");
      if (latest.rawText.trim()) {
        setBusy(true);
        try {
          await createFeedbackRemote({
            rawText: latest.rawText,
            pageUrl: latest.pageUrl,
            pageTitle: latest.pageTitle,
            screenshotDataUrl: latest.screenshotDataUrl,
            source: "CHROME_EXTENSION",
          });
          for (const r of rest) {
            if (!r.rawText.trim()) continue;
            await createFeedbackRemote({
              rawText: r.rawText,
              pageUrl: r.pageUrl,
              pageTitle: r.pageTitle,
              screenshotDataUrl: r.screenshotDataUrl,
              source: "CHROME_EXTENSION",
            });
          }
          ackPendingReports(reports.map((r) => r.id));
          navigate("/inbox");
        } catch {
          setInfo("自動取り込みに失敗。内容を確認して手動送信してください。");
        } finally {
          setBusy(false);
        }
      }
    })();

    return () => window.removeEventListener("online", flush);
  }, [params, navigate, mobile]);

  // デスクトップ: どこでも Ctrl/⌘+V で画像ペースト
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)) return;
      void extractImageFromClipboardEvent(e).then((url) => {
        if (!url) return;
        e.preventDefault();
        setScreenshotDataUrl(url);
        setInfo("クリップボードの画像を添付しました");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const onDesktopFile = async (file: File | null) => {
    if (!file) return;
    setScreenshotDataUrl(await fileToDataUrl(file));
  };

  const resolveSource = (): FeedbackSource => {
    if (captureSource === "SHARE_TARGET" || captureSource === "CHROME_EXTENSION") return captureSource;
    if (isStandalonePwa() || mobile) return "MOBILE_PWA";
    return "APP_WIDGET";
  };

  const submit = async (forceNew = false) => {
    const hasText = Boolean(rawText.trim());
    const hasAudio = Boolean(audioDataUrl);
    if (!hasText && !hasAudio) return;
    const rate = checkCaptureRateLimit();
    if (!rate.ok) {
      setInfo(`送信が多すぎます。${rate.retryAfterSec}秒後に再試行してください。`);
      return;
    }
    setBusy(true);
    try {
      const raw =
        rawText.trim() ||
        (hasAudio ? "（音声メモのみ。文字起こしなし）" : "");
      const textToSend = loadSettings().autoMaskPii ? maskPii(raw).text : raw;
      const consoleSnippet =
        attachConsole && typeof performance !== "undefined"
          ? `ua=${navigator.userAgent.slice(0, 80)}; online=${navigator.onLine}; ts=${new Date().toISOString()}`
          : undefined;
      const idempotencyKey = crypto.randomUUID();
      const source = resolveSource();
      const payload = {
        rawText: textToSend,
        pageUrl: pageUrl || undefined,
        pageTitle: pageTitle || undefined,
        screenshotDataUrl,
        audioDataUrl,
        consoleSnippet,
        idempotencyKey,
        source,
      };
      if (!navigator.onLine) {
        enqueueOffline(payload);
        setOfflineCount(loadQueue().length);
        setInfo("オフラインのためキューに保存しました。復帰後に自動送信します。");
        setRawText("");
        return;
      }
      if (!forceNew && dups[0]?.kind === "issue") {
        const fb = await createFeedbackRemote(payload);
        await mergeIntoIssueRemote(fb.id, dups[0].id);
        navigate(`/issues/${dups[0].id}`);
        return;
      }
      await createFeedbackRemote(payload);
      navigate("/my-feedback");
    } catch {
      enqueueOffline({
        rawText:
          rawText.trim() ||
          (audioDataUrl ? "（音声メモのみ。文字起こしなし）" : ""),
        pageUrl,
        pageTitle,
        screenshotDataUrl,
        audioDataUrl,
        source: resolveSource(),
      });
      setOfflineCount(loadQueue().length);
      setInfo("送信に失敗したためオフラインキューへ保存しました。");
    } finally {
      setBusy(false);
    }
  };

  if (!canCapture()) {
    return <Navigate to="/my-feedback" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Capture</p>
          <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">{t("capture_title")}</h1>
          <p className="mt-2 text-sm text-ink/60">
            {mobile
              ? "最速は スクショ → 話す → 送信。文字は端末の音声認識、ダメならキーボードのマイクか音声添付。"
              : t("capture_hint")}
          </p>
        </div>
        {chromeExtensionSupported() ? (
          <Link
            to="/extension/install"
            className={`min-h-[40px] rounded-xl px-3 py-2 text-xs font-semibold ${extOk ? "bg-sand text-ink" : "bg-ink text-paper"}`}
          >
            {extOk === null ? "拡張確認中…" : extOk ? "拡張 接続中" : "拡張を入れる"}
          </Link>
        ) : (
          <Link
            to="/extension/install"
            className="min-h-[40px] rounded-xl bg-sand px-3 py-2 text-xs font-semibold text-ink"
          >
            携帯の使い方
          </Link>
        )}
      </div>

      {info && <p className="rounded-xl border border-mint/30 bg-sand px-3 py-2 text-sm">{info}</p>}
      {offlineCount > 0 && (
        <p className="text-xs text-amber-800">オフラインキュー: {offlineCount} 件待機中</p>
      )}

      {/* モバイル最速: スクショ → 話す → 送信 */}
      {mobile ? (
        <MobileScreenshotAttach
          screenshotDataUrl={screenshotDataUrl}
          onChange={setScreenshotDataUrl}
          onAnnotate={() => setAnnotateOpen(true)}
        />
      ) : null}

      {mobile && (
        <VoiceInputButton
          variant="hero"
          value={rawText}
          onChange={setRawText}
          onFocusTextarea={() => {
            const el = textareaRef.current;
            if (!el) return;
            el.focus();
            setInfo(
              "入力欄を開いたら、キーボードのマイク（🎤）をタップして話してください",
            );
          }}
        />
      )}

      <label className="block">
        <span className="text-sm font-medium">内容</span>
        <textarea
          ref={textareaRef}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={mobile ? 3 : 5}
          className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-3 text-base outline-none focus:border-mint sm:text-sm"
          placeholder={mobile ? "話すか、ここに書く…" : "例: このボタンの意味が分からない"}
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="on"
        />
        {piiHits.length > 0 && (
          <p className="mt-1 text-xs text-amber-800">
            機微情報っぽい文字列を検出: {piiHits.join(", ")}
            {loadSettings().autoMaskPii ? "（送信時に自動マスク）" : ""}
          </p>
        )}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {!mobile && (
          <VoiceInputButton
            variant="compact"
            value={rawText}
            onChange={setRawText}
            onFocusTextarea={() => textareaRef.current?.focus()}
          />
        )}
        <button
          type="button"
          className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-semibold ${
            recording ? "border-mint bg-sand" : "border-ink/15"
          }`}
          onClick={async () => {
            if (recording && mediaRef.current) {
              mediaRef.current.stop();
              setRecording(false);
              return;
            }
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mime = MediaRecorder.isTypeSupported("audio/webm")
                ? "audio/webm"
                : MediaRecorder.isTypeSupported("audio/mp4")
                  ? "audio/mp4"
                  : "";
              const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
              chunksRef.current = [];
              rec.ondataavailable = (e) => {
                if (e.data.size) chunksRef.current.push(e.data);
              };
              rec.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
                const reader = new FileReader();
                reader.onload = () => setAudioDataUrl(String(reader.result));
                reader.readAsDataURL(blob);
                stream.getTracks().forEach((tr) => tr.stop());
              };
              mediaRef.current = rec;
              rec.start();
              setRecording(true);
              setInfo(
                mobile
                  ? "録音中… 停止後にそのまま送信できます（文字起こしできない端末向け）"
                  : "録音中…",
              );
            } catch {
              setInfo("マイク権限が必要です");
            }
          }}
        >
          {recording ? "録音停止" : mobile ? "音声のまま添付" : "音声添付"}
        </button>
        {audioDataUrl && (
          <button type="button" className="text-xs text-ink/50" onClick={() => setAudioDataUrl(undefined)}>
            音声削除
          </button>
        )}
      </div>
      {audioDataUrl && <audio controls src={audioDataUrl} className="w-full" />}

      {dups.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm" role="status">
          <p className="font-semibold text-amber-950">似た報告があります</p>
          <ul className="mt-2 space-y-2 text-xs text-amber-900">
            {dups.map((d) => (
              <li
                key={`${d.kind}-${d.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-2 py-1.5"
              >
                <span>
                  [{d.kind}] {d.title}（{(d.score * 100).toFixed(0)}%）
                </span>
                {d.kind === "issue" && (
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-[36px] rounded-lg bg-mint px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const textToSend = loadSettings().autoMaskPii
                          ? maskPii(rawText.trim()).text
                          : rawText.trim();
                        const fb = await createFeedbackRemote({
                          rawText: textToSend,
                          pageUrl: pageUrl || undefined,
                          pageTitle: pageTitle || undefined,
                          screenshotDataUrl,
                          audioDataUrl,
                          source: resolveSource(),
                        });
                        await mergeIntoIssueRemote(fb.id, d.id);
                        navigate(`/issues/${d.id}`);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    この Issue に＋1
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="min-h-[40px] rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
              onClick={() => void submit(true)}
            >
              それでも新規投稿
            </button>
          </div>
        </div>
      )}

      <details className="rounded-xl border border-ink/10 bg-white px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-ink/70">詳細（URL・環境）</summary>
        <div className="mt-3 space-y-3 pb-1">
          <label className="block">
            <span className="text-xs font-medium text-ink/55">ページURL（任意）</span>
            <input
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              inputMode="url"
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-mint"
              placeholder="https://…"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink/55">ページタイトル（任意）</span>
            <input
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-mint"
            />
          </label>
          <div className="rounded-xl bg-sand/60 px-3 py-2 text-[11px] text-ink/55">
            自動付与: app {APP_VERSION} · env {loadSettings().environmentOverride || detectEnvironment()} ·{" "}
            {navigator.platform} · {window.innerWidth}×{window.innerHeight}
            {isStandalonePwa() && " · PWA"}
            {loadSettings().maskPrivateHints && " · privateマスク方針ON"}
          </div>
          <label className="flex min-h-[40px] items-center gap-2 text-xs text-ink/60">
            <input
              type="checkbox"
              checked={attachConsole}
              onChange={(e) => setAttachConsole(e.target.checked)}
            />
            簡易診断メタを添付（CAP-010 stub）
          </label>
        </div>
      </details>

      {!mobile && (
        <label className="block">
          <span className="text-sm font-medium">スクリーンショット（任意）</span>
          <input
            ref={desktopFileRef}
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm"
            onChange={(e) => void onDesktopFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-[11px] text-ink/45">Ctrl/⌘+V でクリップボード画像も添付できます</p>
          {screenshotDataUrl && (
            <div className="mt-3 space-y-2">
              <img
                src={screenshotDataUrl}
                alt="添付プレビュー"
                className="max-h-48 rounded-lg border border-ink/10"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold"
                  onClick={() => setAnnotateOpen(true)}
                >
                  注釈を付ける
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs text-ink/50"
                  onClick={() => setScreenshotDataUrl(undefined)}
                >
                  削除
                </button>
              </div>
            </div>
          )}
        </label>
      )}

      {annotateOpen && screenshotDataUrl && (
        <ScreenshotAnnotator
          src={screenshotDataUrl}
          onCancel={() => setAnnotateOpen(false)}
          onSave={(url) => {
            setScreenshotDataUrl(url);
            setAnnotateOpen(false);
          }}
        />
      )}

      {dups.length === 0 && (
        <button
          type="button"
          disabled={busy || (!rawText.trim() && !audioDataUrl)}
          onClick={() => void submit(true)}
          className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 w-full rounded-2xl bg-mint px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-mint/25 disabled:opacity-50 hover:bg-mint-bright lg:static lg:w-auto lg:shadow-none"
        >
          {busy
            ? t("capture_sending")
            : mobile && screenshotDataUrl && rawText.trim()
              ? "スクショ付きで送信"
              : t("capture_submit")}
        </button>
      )}
    </div>
  );
}
