import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  MessageSquare,
  LayoutList,
  Smartphone,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  X,
  CloudUpload,
} from 'lucide-react';
import MediaDropzone from '../components/MediaDropzone';
import { WATERMARK } from '../constants/brand';
import { repurposeViaApi, scheduleViaApi, type PublishMode } from '../lib/api';
import { checkBrandSafety } from '../services/brandSafety';
import { generateScript } from '../services/scriptGenerator';
import { repurposeContent, scheduleToAyrshare } from '../services/repurposeEngine';
import { uploadAllMedia } from '../services/mediaUpload';
import { useApp } from '../store/appContext';
import type { RepurposeContent } from '../types';
import type { LocalMediaFile, UploadedMedia } from '../types/media';

const platformIcons = {
  reels: Smartphone,
  carousel: Smartphone,
  x_thread: MessageCircle,
  line: MessageSquare,
} as const;

const platformColors = {
  reels: 'text-neutral-700',
  carousel: 'text-neutral-700',
  x_thread: 'text-neutral-700',
  line: 'text-neutral-700',
} as const;

export default function MagicCreator() {
  const { plan } = useApp();
  const [searchParams] = useSearchParams();
  const [idea, setIdea] = useState('');
  const [localMedia, setLocalMedia] = useState<LocalMediaFile[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<RepurposeContent[] | null>(null);
  const [safetyWarning, setSafetyWarning] = useState<string[] | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [publishMode, setPublishMode] = useState<PublishMode>('notify');

  useEffect(() => {
    const fromTrend = searchParams.get('idea');
    if (fromTrend) setIdea(fromTrend);
  }, [searchParams]);

  useEffect(() => {
    return () => {
      localMedia.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [localMedia]);

  const canGenerate = idea.trim().length > 0 || localMedia.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setResults(null);
    setSafetyWarning(null);
    setScheduleMessage(null);
    setUploadMessage(null);

    const effectiveIdea =
      idea.trim() ||
      `アップロードした${localMedia[0]?.kind === 'video' ? '動画' : '画像'}「${localMedia[0]?.name ?? '素材'}」を使った投稿`;

    try {
      let mediaUrls: string[] = [];

      if (localMedia.length > 0) {
        setIsUploading(true);
        try {
          const uploaded = await uploadAllMedia(localMedia);
          setUploadedMedia(uploaded);
          mediaUrls = uploaded.map((m) => m.publicUrl);
          setUploadMessage(`${uploaded.length}件の素材をGCP Storageにアップロードしました`);
        } catch {
          setUploadMessage('クラウドアップロードはスキップしました（ローカルプレビューのみで生成）');
          mediaUrls = localMedia.map((m) => m.previewUrl);
        } finally {
          setIsUploading(false);
        }
      }

      try {
        const apiResult = await repurposeViaApi({
          idea: effectiveIdea,
          plan,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        });
        if (apiResult.safetyViolations?.length) {
          setSafetyWarning(apiResult.safetyViolations);
        }
        setResults(apiResult.results as RepurposeContent[]);
        if (apiResult.usedGemini) {
          setUploadMessage((prev) =>
            prev ? `${prev}（Gemini AI 生成）` : 'Gemini AI でコンテンツを生成しました',
          );
        }
      } catch {
        const safety = checkBrandSafety(effectiveIdea);
        if (!safety.safe) setSafetyWarning(safety.violations);

        const script = generateScript(effectiveIdea);
        const content = repurposeContent(effectiveIdea, script, plan);
        if (mediaUrls.length > 0) {
          content[0] = {
            ...content[0],
            content: `${content[0].content}\n\n[添付素材: ${mediaUrls.length}件]`,
          };
        }
        setResults(content);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleAll = async () => {
    if (!results) return;
    setIsScheduling(true);

    try {
      const result = await scheduleViaApi({
        contents: results.map((r) => ({
          platform: r.platform,
          label: r.label,
          content: r.content,
          carouselSlides: r.carouselSlides,
        })),
        scheduledAt: new Date(scheduleDate).toISOString(),
        publishMode,
        mediaUrls: uploadedMedia.length > 0 ? uploadedMedia.map((m) => m.publicUrl) : undefined,
      });
      const trackingNote = result.trackingLinks?.length
        ? ` 計測リンク ${result.trackingLinks.length} 件を生成しました。`
        : '';
      setScheduleMessage(`${result.message}${trackingNote}`);
    } catch {
      const result = await scheduleToAyrshare(results, new Date(scheduleDate));
      setScheduleMessage(result.message);
    }

    setIsScheduling(false);
    setScheduleModal(false);
  };

  return (
    <div className="buzz-page">
      <div>
        <h2 className="text-2xl font-bold mb-2">マジック・クリエイター</h2>
        <p className="text-neutral-600">
          1つのアイデアや素材から、全SNSプラットフォーム向けコンテンツを自動生成（Repurpose）。
          {plan === 'starter' && (
            <span className="text-neutral-700 ml-1">Starterプランでは透かし「{WATERMARK}」が付与されます。</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="buzz-card-pad">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <span className="w-6 h-6 border border-neutral-300 bg-neutral-100 text-neutral-700 flex items-center justify-center text-xs font-bold">1</span>
              素材を入力
            </h3>

            <div className="space-y-4">
              <MediaDropzone
                files={localMedia}
                onChange={setLocalMedia}
                disabled={isGenerating}
              />

              <div>
                <label className="text-xs text-neutral-600 mb-1 block">伝えたい内容・アイデア</label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  className="buzz-input h-24 resize-none"
                  placeholder="例: 新作の春カラーをアピールしたい。透明感があって色落ちしにくいのが特徴。"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !canGenerate}
                className="buzz-btn-primary w-full disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 animate-spin" />
                    {isUploading ? 'GCPへアップロード中...' : '魔法をかけています...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />
                    各SNS用に一発生成
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 relative min-h-[280px] lg:min-h-[500px]">
          {!results && !isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
              <div className="mb-4 flex h-16 w-16 items-center justify-center border border-neutral-200 bg-neutral-50">
                <LayoutList className="w-8 h-8 opacity-50" />
              </div>
              <p>素材またはアイデアを入力して生成を開始してください</p>
            </div>
          )}

          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-700">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
                <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 animate-pulse" />
              </div>
              <p className="mt-4 animate-pulse">
                {isUploading ? 'GCP Storageへ素材を送信中...' : '過去のバズパターンから最適な台本を構成中...'}
              </p>
            </div>
          )}

          {results && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {uploadMessage && (
                <div className="flex items-start gap-3 p-4 rounded-xl buzz-alert buzz-alert-info text-sm">
                  <CloudUpload className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{uploadMessage}</p>
                </div>
              )}

              {uploadedMedia.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {uploadedMedia.map((m) => (
                    <div key={m.id} className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-neutral-200">
                      {m.previewUrl ? (
                        m.kind === 'video' ? (
                          <video src={m.previewUrl} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={m.previewUrl} alt={m.name} className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] text-neutral-500">GCP</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {safetyWarning && (
                <div className="flex items-start gap-3 p-4 rounded-xl buzz-alert buzz-alert-warning text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">ブランドセーフティフィルターが検知しました</p>
                    <p className="text-amber-900/80">NGワード: {safetyWarning.join('、')} — 自動で表現を調整しました。</p>
                  </div>
                </div>
              )}

              {scheduleMessage && (
                <div className="flex items-start gap-3 p-4 rounded-xl buzz-alert buzz-alert-success text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{scheduleMessage}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 border border-neutral-300 bg-neutral-100 text-neutral-700 flex items-center justify-center text-xs font-bold">2</span>
                  生成結果 (Repurpose)
                </h3>
                <button
                  type="button"
                  onClick={() => setScheduleModal(true)}
                  className="buzz-btn-primary text-sm px-4 py-2"
                >
                  <Calendar className="w-4 h-4" />
                  すべて一括予約
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((item) => {
                  const Icon = platformIcons[item.platform];
                  const color = platformColors[item.platform];
                  return (
                    <div
                      key={item.platform}
                      className="p-5 rounded-xl bg-slate-800/50 border border-neutral-200 hover:border-indigo-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className={`w-5 h-5 ${color}`} />
                        <span className="font-medium text-sm">{item.label}</span>
                      </div>
                      {item.carouselSlides ? (
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                          {item.carouselSlides.map((slide, i) => (
                            <div
                              key={slide}
                              className="aspect-[4/5] rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center text-[10px] text-neutral-500 p-1 text-center overflow-hidden sm:w-1/4"
                            >
                              {i === 0 && localMedia[0]?.kind === 'image' ? (
                                <img src={localMedia[0].previewUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                i === 0 ? '表紙' : slide.slice(0, 12)
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mb-4 h-32 overflow-hidden whitespace-pre-wrap border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 relative">
                          {item.content}
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-neutral-50 to-transparent"></div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setScheduleModal(true)}
                        className="w-full border border-neutral-200 py-2 text-xs font-medium transition-colors hover:border-neutral-900"
                      >
                        編集・予約
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {scheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4"
            onClick={() => !isScheduling && setScheduleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">投稿を予約</h3>
                <button
                  type="button"
                  onClick={() => setScheduleModal(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-neutral-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                投稿モードと日時を選んで予約登録します。時刻到来時に Worker が処理します。
              </p>
              <label className="text-xs text-neutral-600 mb-1 block">投稿モード</label>
              <select
                value={publishMode}
                onChange={(e) => setPublishMode(e.target.value as PublishMode)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base sm:text-sm mb-4 focus:outline-none focus:border-neutral-900"
              >
                <option value="notify">通知リマインダー（Slack/LINE に文案）</option>
                <option value="approval">承認後投稿（ダッシュボードで承認）</option>
                <option value="meta">Meta 自動投稿</option>
                <option value="line">LINE ブロードキャスト</option>
                <option value="auto">自動（接続に応じて）</option>
              </select>
              <label className="text-xs text-neutral-600 mb-1 block">投稿日時</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base sm:text-sm mb-6 focus:outline-none focus:border-neutral-900"
              />
              <button
                type="button"
                onClick={handleScheduleAll}
                disabled={isScheduling}
                className="buzz-btn-primary w-full disabled:opacity-70"
              >
                {isScheduling ? '予約中...' : `${results?.length ?? 0}件を予約する`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
