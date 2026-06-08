import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Download, ExternalLink, Loader2, Printer } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StepScreenshotPreview from "../components/StepScreenshotPreview";
import { getManual, listSteps } from "../services/manuals";
import { buildShareUrl, getLatestShareTokenForManual } from "../services/share";
import { downloadAsHtml, downloadAsWordDoc, formatStepsForClipboard } from "../lib/exportManual";
import { exportToGoogleDocsForCurrentUser } from "../lib/exportGoogleDoc";
import { generateManualPdf } from "../services/exportApi";
import type { ManualStep } from "../types";

type FallbackDownload = { label: string; url: string; filename: string };

export default function ManualPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState<ManualStep[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  const [exportError, setExportError] = useState("");
  const [exportOk, setExportOk] = useState("");
  const [fallbackDownload, setFallbackDownload] = useState<FallbackDownload | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const m = await getManual(id);
      if (!m) {
        setLoading(false);
        return;
      }
      setTitle(m.title);
      setSteps(await listSteps(id));
      const token = await getLatestShareTokenForManual(id);
      if (token) setShareUrl(buildShareUrl(token));
      setLoading(false);
    })();
  }, [id]);

  const runExport = async (kind: "word" | "html" | "gdoc" | "pdf") => {
    setExportError("");
    setExportOk("");
    setFallbackDownload(null);
    if (steps.length === 0) {
      setExportError("手順がありません。編集画面で手順を追加してからエクスポートしてください。");
      return;
    }
    setExportBusy(kind);
    try {
      if (kind === "word") {
        const { filename, fallbackUrl } = await downloadAsWordDoc(title, steps);
        setExportOk(`Wordファイル（${filename}）のダウンロードを開始しました。`);
        setFallbackDownload({ label: "Wordを再度ダウンロード", url: fallbackUrl, filename });
      } else if (kind === "html") {
        const { filename, fallbackUrl } = await downloadAsHtml(title, steps);
        setExportOk(`HTMLファイル（${filename}）のダウンロードを開始しました。`);
        setFallbackDownload({ label: "HTMLを再度ダウンロード", url: fallbackUrl, filename });
      } else if (kind === "gdoc") {
        const url = await exportToGoogleDocsForCurrentUser(title, steps);
        const opened = window.open(url, "_blank", "noopener");
        if (!opened) {
          setExportOk("Googleドキュメントを作成しました。下のリンクから開いてください。");
          setFallbackDownload({ label: "Googleドキュメントを開く", url, filename: "" });
        } else {
          setExportOk("Googleドキュメントを新しいタブで開きました。");
        }
      } else if (kind === "pdf") {
        if (!id) throw new Error("マニュアルIDがありません");
        const { pdfUrl } = await generateManualPdf(id);
        const opened = window.open(pdfUrl, "_blank", "noopener");
        if (!opened) {
          setExportOk("PDFを生成しました。下のリンクからダウンロードしてください。");
          setFallbackDownload({ label: "PDFを開く", url: pdfUrl, filename: "" });
        } else {
          setExportOk("PDFを新しいタブで開きました。");
        }
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "エクスポートに失敗しました");
    } finally {
      setExportBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
      </div>
    );
  }

  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <>
      <PageHeader
        title="プレビュー"
        description="完成イメージの確認・印刷・Word/Googleドキュメントへの書き出し"
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/manuals"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              一覧に戻る
            </Link>
            <Link
              to={`/manuals/${id}/edit`}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              編集に戻る
            </Link>
            <Link
              to={`/manuals/${id}/share`}
              className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              共有設定
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-2xl px-6 pb-16">
        <div className="no-print mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(formatStepsForClipboard(title, steps));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Copy size={14} /> {copied ? "コピー済み" : "手順をコピー"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer size={14} /> 印刷
            </button>
            <button
              type="button"
              disabled={exportBusy != null}
              onClick={() => void runExport("word")}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {exportBusy === "word" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Word用 (.doc)
            </button>
            <button
              type="button"
              disabled={exportBusy != null}
              onClick={() => void runExport("html")}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {exportBusy === "html" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              HTML（高画質）
            </button>
            <button
              type="button"
              disabled={exportBusy != null}
              onClick={() => void runExport("gdoc")}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {exportBusy === "gdoc" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
              Googleドキュメントに保存
            </button>
            <button
              type="button"
              disabled={exportBusy != null || !id}
              onClick={() => void runExport("pdf")}
              className="inline-flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-800 hover:bg-primary-100 disabled:opacity-50"
            >
              {exportBusy === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              PDF（サーバー生成・A4）
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Googleドキュメント: ログイン中の Google アカウントの Drive に新規ドキュメントを作成します（初回は Drive
            へのアクセス許可が必要です）。
          </p>
          <details className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-950">
            <summary className="cursor-pointer font-semibold">「安全ではない」と表示される場合</summary>
            <p className="mt-2 leading-relaxed">
              クリッピットは Google のアプリ審査（本番公開）前のテスト段階です。警告画面では画面左下の
              <strong>「詳細」</strong>
              を開き、
              <strong>「クリッピット（安全ではないページ）に移動」</strong>
              を選んでから「許可」を押してください。社内利用では Google Cloud の OAuth 同意画面で利用する Gmail
              を「テストユーザー」に追加しておくとスムーズです。本番公開後はこの警告は出なくなります。
            </p>
          </details>
          {exportOk && <p className="text-xs text-success-700">{exportOk}</p>}
          {fallbackDownload && (
            <a
              href={fallbackDownload.url}
              download={fallbackDownload.filename || undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
            >
              <Download size={12} />
              {fallbackDownload.label}
            </a>
          )}
          {exportError && <p className="text-xs text-danger-600">{exportError}</p>}
        </div>

        {shareUrl && (
          <p className="no-print mb-6 text-xs text-slate-500">
            公開共有URL:{" "}
            <a href={shareUrl} className="text-primary-600 hover:underline" target="_blank" rel="noreferrer">
              {shareUrl}
            </a>
          </p>
        )}

        <article className="shared-manual rounded-2xl border border-slate-200 bg-white px-6 py-8 print:border-0">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-xs text-slate-400">{sorted.length} 手順</p>
          <ol className="mt-8 list-none space-y-8 p-0">
            {sorted.map((s, i) => (
              <li key={s.id} className="break-inside-avoid">
                <h2 className="text-base font-bold text-slate-900">
                  {i + 1}. {s.title || `手順 ${i + 1}`}
                </h2>
                <div className="mt-3">
                  <StepScreenshotPreview
                    screenshotUrl={s.screenshotUrl}
                    stepIndex={i + 1}
                    stepType={s.type}
                    showClickMarker={false}
                  />
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
                  {s.instruction}
                </p>
                {s.note && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{s.note}</p>
                )}
              </li>
            ))}
          </ol>
        </article>
      </div>
    </>
  );
}
