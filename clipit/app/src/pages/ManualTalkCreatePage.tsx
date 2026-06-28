import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { folderIdFromSearch } from "../lib/folderContext";
import { layoutIdFromSearch } from "../lib/uiLayoutTemplates";
import { resolveTocEnabled } from "../lib/manualToc";
import { Camera, ChevronDown, ChevronUp, Loader2, MessageCircle, Sparkles, Video } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageHelpTip from "../components/PageHelpTip";
import FilePickButton from "../components/FilePickButton";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { AUDIENCE_OPTIONS, labelsToAudience } from "../lib/format";
import { applyUiLayoutToSteps, createManual } from "../services/manuals";
import { ingestTalkSteps, mergeTalkStepsWithApi, type MergedTalkStep, type TalkScreenshotPayload } from "../services/talkCreate";
import { polishInstructionsWithApi, type InstructionTone } from "../services/ai";
import type { TargetAudience } from "../types";
import { parseMeetTranscript, parseTranscriptFile, suggestLabelsFromTranscript } from "../lib/meetTranscript";

type ShotItem = TalkScreenshotPayload & { id: string; previewUrl: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = reader.result as string;
      const base64 = data.includes(",") ? data.split(",")[1]! : data;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

const MEET_STEPS = [
  "Google Meet で会議を開始し、画面共有で業務画面を見せながら説明します。",
  "会議後、Google ドキュメントの「文字起こし」タブから全文をコピーするか、.txt / .vtt ファイルをアップロードします。",
  "説明の順にスクショを撮り、下にアップロードします（Alt+Shift+S または OS のスクショ）。",
  "Meet の文字起こしは冒頭に1つだけ時刻があり、詳細なタイムスタンプは付きません。各画像に「この画面で説明したこと」を一言入れると、AI が画像と説明を対応づけやすくなります。",
];

export default function ManualTalkCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFolderId = folderIdFromSearch(searchParams);
  const uiLayoutId = layoutIdFromSearch(searchParams);
  const tocEnabled = resolveTocEnabled(searchParams);
  const { organization } = useOrg();
  const { user, demoMode } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>(["新人スタッフ向け"]);
  const [transcript, setTranscript] = useState("");
  const [shots, setShots] = useState<ShotItem[]>([]);
  const [tone, setTone] = useState<InstructionTone>("simple");
  const [showMeetGuide, setShowMeetGuide] = useState(true);
  const [busy, setBusy] = useState(false);
  const [polishBusy, setPolishBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<MergedTalkStep[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [usedGemini, setUsedGemini] = useState(false);

  const parsedTranscript = useMemo(
    () => (transcript.trim() ? parseMeetTranscript(transcript, shots.length) : null),
    [transcript, shots.length],
  );

  const applySuggestedLabels = () => {
    if (!transcript.trim() || !shots.length) return;
    const suggested = suggestLabelsFromTranscript(transcript, shots.length);
    setShots((cur) =>
      cur.map((s, i) => ({
        ...s,
        label: s.label?.trim() ? s.label : (suggested[i] ?? s.label),
      })),
    );
  };

  const toggle = (label: string) =>
    setSelected((cur) => (cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]));

  const onFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const next: ShotItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await fileToBase64(file);
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        imageBase64: base64,
        previewUrl: URL.createObjectURL(file),
        timestamp: "",
        label: "",
      });
    }
    setShots((cur) => [...cur, ...next]);
  }, []);

  const updateShot = (id: string, patch: Partial<ShotItem>) => {
    setShots((cur) => cur.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeShot = (id: string) => {
    setShots((cur) => {
      const item = cur.find((s) => s.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return cur.filter((s) => s.id !== id);
    });
  };

  const runMerge = async () => {
    if (!organization || !transcript.trim() || !shots.length) return;
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      const audiences = labelsToAudience(selected) as TargetAudience[];
      const result = await mergeTalkStepsWithApi({
        organizationId: organization.id,
        transcript: transcript.trim(),
        screenshots: shots.map(({ imageBase64, timestamp, label }) => ({
          imageBase64,
          timestamp: timestamp?.trim() || undefined,
          label: label?.trim() || undefined,
        })),
        tone,
        audience: audiences[0] ?? "new_staff",
      });
      setPreview(result.steps);
      setWarnings(result.warnings);
      setUsedGemini(false);
      setStep(3);
    } catch (e) {
      setError((e as Error).message ?? "統合に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const updatePreviewStep = (index: number, patch: Partial<MergedTalkStep>) => {
    setPreview((cur) => cur?.map((s, i) => (i === index ? { ...s, ...patch } : s)) ?? null);
  };

  const polishPreviewInstructions = async () => {
    if (!organization || !preview?.length || demoMode) return;
    const hasText = preview.some((s) => s.instruction.trim().length >= 4);
    if (!hasText) {
      setError("整形する説明文がありません。各手順の説明を入力してください。");
      return;
    }
    setPolishBusy(true);
    setError("");
    try {
      const audiences = labelsToAudience(selected) as TargetAudience[];
      const result = await polishInstructionsWithApi(
        organization.id,
        preview.map((s) => ({
          title: s.title,
          instruction: s.instruction,
          elementText: s.elementText,
        })),
        tone,
        audiences[0] ?? "new_staff",
      );
      setPreview((cur) =>
        cur?.map((s, i) => ({
          ...s,
          instruction: result.instructions[i] ?? s.instruction,
        })) ?? null,
      );
      setUsedGemini(result.usedGemini);
    } catch (e) {
      setError((e as Error).message ?? "文案の整形に失敗しました");
    } finally {
      setPolishBusy(false);
    }
  };

  const finish = async () => {
    if (!preview?.length || !title.trim() || !organization || !user) return;
    if (demoMode) {
      navigate("/manuals/demo-1/edit");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const audiences = labelsToAudience(selected) as TargetAudience[];
      const manualId = await createManual({
        organizationId: organization.id,
        title: title.trim(),
        targetAudience: audiences.length ? audiences : ["new_staff"],
        createdBy: user.uid,
        creationSource: "talk",
        folderId: presetFolderId,
        uiLayoutId,
        tocEnabled,
      });
      await ingestTalkSteps(
        manualId,
        preview.map((s) => ({
          title: s.title,
          instruction: s.instruction,
          note: s.note,
          type: s.type,
          elementText: s.elementText,
          screenshotBase64: shots[s.screenshotIndex]?.imageBase64,
        })),
      );
      await applyUiLayoutToSteps(manualId, uiLayoutId, { forceLayout: true });
      navigate(`/manuals/${manualId}/edit?new=1`);
    } catch (e) {
      setError((e as Error).message ?? "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="話して作成"
        description={
          <Link to="/manuals/new" className="text-primary-600 hover:underline">
            ← 作り方を選び直す
          </Link>
        }
      />
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <PageHelpTip title="話して作成の流れ">
          Google Meet で説明 → 文字起こしを貼り付け → 説明順にスクショをアップロード → AI統合、が基本の流れです。
          説明の区切りで「次」「続いて」と言うと、統合の精度が上がります。
        </PageHelpTip>
        <div className="flex gap-2 text-xs font-semibold text-slate-500">
          {(["基本情報", "文字起こしとスクショ", "プレビュー"] as const).map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 ${step === i + 1 ? "bg-primary-100 text-primary-700" : "bg-slate-100"}`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {error && <p className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">{error}</p>}

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="block text-sm font-semibold text-slate-800">マニュアル名</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：レセコン会計の注意点"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
              <p className="mt-4 text-sm font-semibold text-slate-800">誰向けですか？</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                AIが手順文の言い回しを整えるときの想定読者です（例：新人向けは平易な表現）。マニュアル情報としても保存されます。
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AUDIENCE_OPTIONS.map(({ label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggle(label)}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      selected.includes(label) ? "border-primary-400 bg-primary-50 text-primary-700" : "border-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={!title.trim()}
              onClick={() => setStep(2)}
              className="w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              次へ：Meet の文字起こしとスクショ
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-5">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowMeetGuide((v) => !v)}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Video size={18} className="text-primary-600" />
                  Google Meet での取り方
                </span>
                {showMeetGuide ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {showMeetGuide && (
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                  {MEET_STEPS.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <MessageCircle size={16} />
                文字起こし（貼り付けまたはファイル）
              </label>
              <div className="mt-3">
                <FilePickButton
                  label="文字起こしファイルを選ぶ（.txt / .vtt）"
                  accept=".txt,.vtt,text/plain"
                  onFiles={async (files) => {
                    const file = files[0];
                    if (!file) return;
                    const text = await file.text();
                    setTranscript(parseTranscriptFile(text, file.name));
                  }}
                />
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={12}
                placeholder="Google ドキュメントの文字起こしをそのまま貼り付け（Meet 形式で OK）"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm"
              />
              {parsedTranscript && parsedTranscript.body && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-800">
                    検出した操作説明: {parsedTranscript.segments.length} 件
                    {parsedTranscript.durationSec != null && (
                      <span className="ml-2 font-normal text-slate-500">
                        （会議内 {Math.floor(parsedTranscript.durationSec / 60)} 分程度）
                      </span>
                    )}
                  </p>
                  {parsedTranscript.segments.length > 0 ? (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
                      {parsedTranscript.segments.map((seg) => (
                        <li key={seg}>{seg}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">操作の区切りを自動検出できませんでした。画像の画面メモを入れてください。</p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Camera size={16} />
                スクショ（説明の順に並べる）
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <FilePickButton
                  label="スクショ画像を選ぶ"
                  accept="image/*"
                  multiple
                  onFiles={async (files) => onFiles(files)}
                />
                {shots.length > 0 && (
                  <FilePickButton
                    label="さらに追加"
                    accept="image/*"
                    multiple
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    onFiles={async (files) => onFiles(files)}
                  />
                )}
              </div>
              {shots.length > 0 && transcript.trim() && parsedTranscript && parsedTranscript.segments.length > 0 && (
                <button
                  type="button"
                  onClick={applySuggestedLabels}
                  className="mt-3 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                >
                  文字起こしから画面メモを自動提案
                </button>
              )}
              <div className="mt-4 space-y-3">
                {shots.map((s, idx) => (
                  <div key={s.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                    <img src={s.previewUrl} alt="" className="h-20 w-32 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-xs font-semibold text-slate-500">画像 {idx + 1}</p>
                      <input
                        placeholder="この画面で説明したこと（例：診察券作成を押す）"
                        value={s.label ?? ""}
                        onChange={(e) => updateShot(s.id, { label: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                      />
                      <input
                        placeholder="タイムスタンプ（任意・行ごとに時刻がある場合のみ）"
                        value={s.timestamp ?? ""}
                        onChange={(e) => updateShot(s.id, { timestamp: e.target.value })}
                        className="w-full rounded-lg border border-slate-100 px-3 py-1 text-xs text-slate-500"
                      />
                    </div>
                    <button type="button" onClick={() => removeShot(s.id)} className="text-xs text-danger-600">
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <label className="flex items-center gap-2">
                文案のトーン
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as InstructionTone)}
                  className="rounded-lg border border-slate-300 px-2 py-1"
                >
                  <option value="simple">かんたん</option>
                  <option value="formal">丁寧</option>
                  <option value="manual">業務マニュアル風</option>
                </select>
              </label>
              <p className="w-full text-xs text-slate-500">
                文字起こしとスクショを AI で統合します。説明中に「次」「続いて」と言うと区切りが認識されやすくなります。統合後に説明文を直してから「AIで文案を整える」を押せます。
              </p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-slate-300 px-6 py-3 text-sm">
                戻る
              </button>
              <button
                type="button"
                disabled={!transcript.trim() || !shots.length || busy}
                onClick={runMerge}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                AIで手順に統合
              </button>
            </div>
          </div>
        )}

        {step === 3 && preview && (
          <div className="space-y-4">
            {usedGemini ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                AIで文案を整えました。内容を確認してから保存してください。
              </p>
            ) : (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                AIで文字起こしとスクショを統合しました。説明文を確認・修正してから保存してください。
              </p>
            )}
            {!demoMode && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <button
                  type="button"
                  disabled={polishBusy || !preview.some((s) => s.instruction.trim().length >= 4)}
                  onClick={() => void polishPreviewInstructions()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {polishBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  AIで文案を整える
                </button>
                <p className="text-xs text-slate-500">
                  説明文を直したあと、必要なときだけ押してください（全手順をまとめて1回）
                </p>
              </div>
            )}
            {warnings.length > 0 && (
              <ul className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {warnings.map((w) => (
                  <li key={w}>・{w}</li>
                ))}
              </ul>
            )}
            <div className="space-y-3">
              {preview.map((s, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex-1 text-xs font-semibold text-slate-600">
                      手順 {i + 1} のタイトル
                      <input
                        value={s.title}
                        onChange={(e) => updatePreviewStep(i, { title: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900"
                      />
                    </label>
                    {s.type && s.type !== "normal" && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {s.type}
                      </span>
                    )}
                  </div>
                  <label className="mt-3 block text-xs font-semibold text-slate-600">
                    説明文
                    <textarea
                      rows={4}
                      value={s.instruction}
                      onChange={(e) => updatePreviewStep(i, { instruction: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                  {s.note && <p className="mt-2 text-xs text-slate-500">{s.note}</p>}
                  {shots[s.screenshotIndex] && (
                    <img
                      src={shots[s.screenshotIndex].previewUrl}
                      alt=""
                      className="mt-3 max-h-40 rounded-lg border border-slate-200 object-contain"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-slate-300 px-6 py-3 text-sm">
                戻って修正
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={finish}
                className="flex-1 rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "保存中…" : "マニュアルとして保存 → 編集画面へ"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
