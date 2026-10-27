import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, FolderOpen } from "lucide-react";
import StepScreenshotPreview from "../components/StepScreenshotPreview";
import { getFolderShareByToken } from "../services/folderShare";
import { recordReadConfirmation } from "../services/share";
import type { FolderManualSnapshot } from "../types";

export default function SharedFolderPage() {
  const { token } = useParams<{ token: string }>();
  const [folderName, setFolderName] = useState("");
  const [manuals, setManuals] = useState<FolderManualSnapshot[]>([]);
  const [watermark, setWatermark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState("");
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    getFolderShareByToken(token)
      .then((doc) => {
        if (!doc) {
          setError("リンクが無効か、期限切れです。");
          return;
        }
        setFolderName(doc.folderName);
        setManuals(doc.manuals ?? []);
        setWatermark(Boolean(doc.watermark));
        if (doc.manuals?.length === 1) setOpenId(doc.manuals[0]!.manualId);
      })
      .catch(() => setError("読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, [token]);

  const toggle = (manualId: string) => {
    setOpenId((cur) => (cur === manualId ? null : manualId));
  };

  const confirmRead = async (manual: FolderManualSnapshot) => {
    await recordReadConfirmation(manual.manualId, { viewerName });
    setConfirmedIds((s) => new Set(s).add(manual.manualId));
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
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5 text-center text-sm text-slate-600">
        {error}
      </div>
    );
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-lg bg-white px-5 py-6 pb-24">
      {watermark && (
        <div
          className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center opacity-[0.06]"
          aria-hidden
        >
          <span className="rotate-[-24deg] text-6xl font-black text-slate-900">ClipIt</span>
        </div>
      )}

      <header className="mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 text-primary-600">
          <FolderOpen size={22} />
          <span className="text-xs font-bold uppercase tracking-wide">フォルダ共有</span>
        </div>
        <h1 className="mt-2 text-xl font-bold text-slate-900">{folderName}</h1>
        <p className="mt-1 text-sm text-slate-500">{manuals.length} 件のマニュアル</p>
      </header>

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="text-xs font-semibold text-slate-600">お名前（既読確認用・任意）</label>
        <input
          value={viewerName}
          onChange={(e) => setViewerName(e.target.value)}
          placeholder="例：山田"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <ul className="space-y-3">
        {manuals.map((m) => {
          const open = openId === m.manualId;
          const sorted = [...m.steps].sort((a, b) => a.order - b.order);
          const confirmed = confirmedIds.has(m.manualId);

          return (
            <li key={m.manualId} className="overflow-hidden rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => toggle(m.manualId)}
                className="flex w-full items-center justify-between gap-2 bg-slate-50 px-4 py-3 text-left"
              >
                <span className="text-sm font-bold text-slate-900">{m.title}</span>
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  {sorted.length} 手順
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              {open && (
                <div className="border-t border-slate-100 px-4 py-4">
                  <ol className="space-y-8">
                    {sorted.map((s, i) => (
                      <li key={`${m.manualId}-${s.order}`}>
                        <p className="text-sm font-bold text-primary-700">
                          {i + 1}. {s.title}
                        </p>
                        {s.screenshotUrl && (
                          <div className="mt-2">
                            <StepScreenshotPreview
                              screenshotUrl={s.screenshotUrl}
                              clickX={s.clickX}
                              clickY={s.clickY}
                              stepIndex={i + 1}
                              stepType={s.type}
                            />
                          </div>
                        )}
                        {s.instruction && <p className="mt-2 text-sm leading-relaxed text-slate-700">{s.instruction}</p>}
                        {s.note && (
                          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">注意: {s.note}</p>
                        )}
                      </li>
                    ))}
                  </ol>

                  {!confirmed ? (
                    <button
                      type="button"
                      onClick={() => void confirmRead(m)}
                      className="mt-6 w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600"
                    >
                      確認しました
                    </button>
                  ) : (
                    <p className="mt-4 text-center text-xs font-semibold text-success-600">確認済みです</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {manuals.length === 0 && (
        <p className="text-center text-sm text-slate-500">このフォルダにはまだマニュアルがありません。</p>
      )}
    </div>
  );
}
