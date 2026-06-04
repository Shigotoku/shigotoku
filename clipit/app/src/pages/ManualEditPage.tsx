import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Eye, GripVertical, ImagePlus, Plus, Sparkles, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import {
  deleteManual,
  deleteStep,
  getManual,
  insertStepAt,
  listSteps,
  polishInstruction,
  reorderSteps,
  updateManual,
  updateStep,
} from "../services/manuals";
import { generateAllStepsWithApi, generateStepWithApi } from "../services/ai";
import { buildInstructionFromStep } from "../lib/instructionRules";
import { syncExtensionSession, extensionInstallUrl } from "../lib/extensionBridge";
import { uploadStepScreenshot } from "../lib/uploadStepScreenshot";
import { useStepDraft } from "../hooks/useStepDraft";
import StepScreenEditor from "../components/StepScreenEditor";
import { useEditLayoutColumns, ResizeGutter } from "../hooks/useEditLayoutColumns";
import StepScreenshotPreview from "../components/StepScreenshotPreview";
import type { Manual, ManualStep, StepType, TargetAudience } from "../types";

export default function ManualEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manual, setManual] = useState<Manual | null>(null);
  const [steps, setSteps] = useState<ManualStep[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [extSynced, setExtSynced] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [dragStepId, setDragStepId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [screenEditOpen, setScreenEditOpen] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);
  const { widths, dragSteps, dragEdit } = useEditLayoutColumns();

  const load = useCallback(async () => {
    if (!id || id.startsWith("demo")) {
      setManual({
        id: id ?? "demo",
        organizationId: "demo",
        title: "デモマニュアル",
        description: "",
        category: "",
        targetAudience: [],
        status: "draft",
        version: 1,
        createdBy: "",
      });
      setSteps([]);
      setLoading(false);
      return;
    }
    const m = await getManual(id);
    if (!m) {
      navigate("/dashboard");
      return;
    }
    const s = await listSteps(id);
    setManual(m);
    setSteps(s);
    setActiveId((cur) => (cur && s.some((x) => x.id === cur) ? cur : s[0]?.id ?? null));
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const active = steps.find((s) => s.id === activeId) ?? steps[0];

  const saveDraftFields = useCallback(
    async (fields: { title: string; instruction: string; note: string }) => {
      if (!id || !active || id.startsWith("demo")) return;
      await updateStep(id, active.id, fields);
      setSteps((cur) =>
        cur.map((s) => (s.id === active.id ? { ...s, ...fields } : s)),
      );
    },
    [id, active?.id],
  );

  const { draft, update: updateDraft, saveState } = useStepDraft(
    active?.id,
    active
      ? { title: active.title, instruction: active.instruction, note: active.note ?? "" }
      : undefined,
    saveDraftFields,
  );

  const patchActive = async (patch: Partial<ManualStep>) => {
    if (!id || !active || id.startsWith("demo")) return;
    await updateStep(id, active.id, patch);
    setSteps((cur) => cur.map((s) => (s.id === active.id ? { ...s, ...patch } : s)));
  };

  const move = async (stepId: string, dir: -1 | 1) => {
    const idx = steps.findIndex((s) => s.id === stepId);
    const next = idx + dir;
    if (next < 0 || next >= steps.length || !id || id.startsWith("demo")) return;
    const ids = [...steps.map((s) => s.id)];
    [ids[idx], ids[next]] = [ids[next]!, ids[idx]!];
    await reorderSteps(id, ids);
    const reordered = ids.map((sid, i) => ({ ...steps.find((s) => s.id === sid)!, order: i + 1 }));
    setSteps(reordered);
  };

  const reorderByDrag = async (fromId: string, toId: string) => {
    if (fromId === toId || !id || id.startsWith("demo")) return;
    const ids = steps.map((s) => s.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    await reorderSteps(id, ids);
    const reordered = ids.map((sid, i) => ({ ...steps.find((s) => s.id === sid)!, order: i + 1 }));
    setSteps(reordered);
  };

  const handleInsertStep = async (mode: "end" | "before" | "after") => {
    if (!id || id.startsWith("demo")) return;
    setShowAddMenu(false);
    let position = steps.length + 1;
    if (mode === "before" && active) position = active.order;
    if (mode === "after" && active) position = active.order + 1;
    const newId = await insertStepAt(id, position, {
      type: "normal",
      title: `手順 ${position}`,
      instruction: "",
      note: "",
      screenshotUrl: "",
      pageTitle: "",
      pageUrl: "",
      elementText: "",
    });
    await load();
    setActiveId(newId);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!id || !confirm("この手順を削除しますか？")) return;
    if (id.startsWith("demo")) return;
    await deleteStep(id, stepId);
    const next = steps.filter((s) => s.id !== stepId);
    setSteps(next);
    setActiveId(next[0]?.id ?? null);
  };

  const audience = (manual?.targetAudience?.[0] ?? "new_staff") as TargetAudience;

  const applyRuleInstruction = async (tone: "simple" | "formal" | "manual" = "simple") => {
    if (!active || !id) return;
    const text = buildInstructionFromStep(active, tone, audience);
    updateDraft({ instruction: text });
    if (id.startsWith("demo")) return;
    await updateStep(id, active.id, { instruction: text });
    setSteps((cur) => cur.map((s) => (s.id === active.id ? { ...s, instruction: text } : s)));
  };

  const handleAiPolish = async (tone: "simple" | "formal" | "manual" | "detailed") => {
    if (!active) return;
    setAiBusy(true);
    try {
      const orgId = manual?.organizationId;
      if (!orgId || orgId === "demo") return;
      const text = await generateStepWithApi(active, tone, audience, orgId).catch(() =>
        polishInstruction(active, tone === "manual" || tone === "detailed" ? "formal" : tone === "formal" ? "formal" : "simple"),
      );
      updateDraft({ instruction: text });
      if (!id || !active) return;
      await updateStep(id, active.id, { instruction: text });
      setSteps((cur) => cur.map((s) => (s.id === active.id ? { ...s, instruction: text } : s)));
    } finally {
      setAiBusy(false);
    }
  };

  const handleAiAll = async () => {
    if (!id || id.startsWith("demo") || steps.length === 0) return;
    setAiBusy(true);
    try {
      const orgId = manual?.organizationId;
      if (!orgId) return;
      const texts = await generateAllStepsWithApi(steps, "manual", audience, orgId).catch(() =>
        steps.map((s) => polishInstruction(s, "formal")),
      );
      for (let i = 0; i < steps.length; i++) {
        await updateStep(id, steps[i]!.id, { instruction: texts[i] });
      }
      await load();
    } finally {
      setAiBusy(false);
    }
  };

  const handleExtensionSync = async () => {
    if (!id || id.startsWith("demo")) return;
    const ok = await syncExtensionSession(id);
    setExtSynced(ok);
  };

  const saveLabel =
    saveState === "saving"
      ? "保存中…"
      : saveState === "pending"
        ? "保存待ち…"
        : saveState === "saved"
          ? "保存しました"
          : "自動保存";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
      </div>
    );
  }

  if (!manual) return null;

  return (
    <>
      <PageHeader
        title={manual.title}
        description="手順の並び替え・文言の編集・共有の準備（編集は自動保存）"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">{saveLabel}</span>
            {id && !id.startsWith("demo") && (
              <Link
                to={`/manuals/${id}/preview`}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye size={16} /> プレビュー
              </Link>
            )}
            <Link
              to={`/manuals/${id}/share`}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              共有へ
            </Link>
            <button
              type="button"
              onClick={async () => {
                if (!id || id.startsWith("demo")) return;
                await updateManual(id, { status: "published" });
                setManual({ ...manual, status: "published" });
              }}
              className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              {manual.status === "published" ? "公開済み" : "公開する"}
            </button>
          </div>
        }
      />

      {id && !id.startsWith("demo") && (
        <div className="mx-6 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-3 text-sm">
          <span className="font-semibold text-slate-800">Chrome拡張で記録</span>
          <button
            type="button"
            onClick={handleExtensionSync}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-sm hover:bg-primary-50"
          >
            {extSynced ? "連携済み" : "拡張と連携"}
          </button>
          <a href={extensionInstallUrl()} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">
            拡張をインストール
          </a>
          <button
            type="button"
            disabled={aiBusy || steps.length === 0}
            onClick={handleAiAll}
            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Sparkles size={12} /> 全手順をAI生成（Gemini）
          </button>
        </div>
      )}

      <div ref={layoutRef} className="flex min-h-[calc(100vh-8rem)] flex-col lg:flex-row">
        <aside
          className="shrink-0 border-b border-slate-200 bg-white lg:border-b-0 lg:border-r"
          style={{ width: widths.steps }}
        >
          <div className="relative flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-bold text-slate-500">手順 ({steps.length}) · ドラッグで並べ替え</span>
            <button
              type="button"
              onClick={() => setShowAddMenu((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-50"
            >
              <Plus size={14} /> 追加
            </button>
            {showAddMenu && (
              <div className="absolute right-4 top-12 z-20 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button type="button" className="block w-full px-4 py-2 text-left text-xs hover:bg-slate-50" onClick={() => handleInsertStep("end")}>
                  末尾に追加
                </button>
                <button
                  type="button"
                  disabled={!active}
                  className="block w-full px-4 py-2 text-left text-xs hover:bg-slate-50 disabled:opacity-40"
                  onClick={() => handleInsertStep("before")}
                >
                  「{active?.title || "選択中"}」の前に挿入
                </button>
                <button
                  type="button"
                  disabled={!active}
                  className="block w-full px-4 py-2 text-left text-xs hover:bg-slate-50 disabled:opacity-40"
                  onClick={() => handleInsertStep("after")}
                >
                  「{active?.title || "選択中"}」の後に挿入
                </button>
              </div>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto lg:max-h-none">
            {steps.map((s, i) => (
              <li
                key={s.id}
                draggable={!id?.startsWith("demo")}
                onDragStart={() => setDragStepId(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragStepId) void reorderByDrag(dragStepId, s.id);
                  setDragStepId(null);
                }}
                onDragEnd={() => setDragStepId(null)}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={`flex w-full items-start gap-2 border-l-4 px-2 py-3 text-left text-sm transition-colors ${
                    active?.id === s.id
                      ? "border-primary-500 bg-primary-50/80"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <GripVertical size={14} className="mt-1 shrink-0 text-slate-300" aria-hidden />
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="font-medium text-slate-800">{s.title || `手順 ${i + 1}`}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <ResizeGutter
          onDrag={(dx) => {
            const w = layoutRef.current?.clientWidth ?? 1200;
            dragSteps(dx, w);
          }}
        />

        <section className="min-w-0 flex-1 border-b border-slate-200 bg-slate-100 p-4 lg:border-b-0 lg:border-r">
          {active ? (
            <div className="mx-auto w-full max-w-4xl">
              <StepScreenshotPreview
                screenshotUrl={active.screenshotUrl}
                stepIndex={steps.findIndex((s) => s.id === active.id) + 1}
                clickX={active.clickX}
                clickY={active.clickY}
                stepType={active.type}
                imageLoading="eager"
              />
              <p className="mt-2 text-center text-xs text-slate-500">{active.pageTitle || active.pageUrl || "—"}</p>
              {id && !id.startsWith("demo") && (
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-primary-400 hover:text-primary-700">
                  <ImagePlus size={14} />
                  {imgBusy ? "アップロード中…" : "画像を差し替え・挿入"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={imgBusy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file || !id || !active) return;
                      setImgBusy(true);
                      try {
                        const url = await uploadStepScreenshot(id, active.id, file);
                        await patchActive({ screenshotUrl: url });
                      } catch (err) {
                        alert(err instanceof Error ? err.message : "画像のアップロードに失敗しました");
                      } finally {
                        setImgBusy(false);
                      }
                    }}
                  />
                </label>
              )}
            </div>
          ) : (
            <p className="py-20 text-center text-sm text-slate-500">手順を追加してください</p>
          )}
        </section>

        <ResizeGutter
          onDrag={(dx) => {
            const w = layoutRef.current?.clientWidth ?? 1200;
            dragEdit(dx, w);
          }}
        />

        <section className="shrink-0 bg-white p-4" style={{ width: widths.edit }}>
          {active ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => move(active.id, -1)} className="rounded-lg border p-2 hover:bg-slate-50" aria-label="上へ">
                  <ChevronUp size={16} />
                </button>
                <button type="button" onClick={() => move(active.id, 1)} className="rounded-lg border p-2 hover:bg-slate-50" aria-label="下へ">
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteStep(active.id)}
                  className="ml-auto rounded-lg border border-danger-200 p-2 text-danger-600 hover:bg-danger-50"
                  aria-label="削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">手順タイトル</label>
                <input
                  value={draft.title}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">説明文</label>
                <textarea
                  rows={5}
                  value={draft.instruction}
                  onChange={(e) => updateDraft({ instruction: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  入力は自動保存されます（約0.6秒後）。「自動作成」は無料（ルールベース）。Gemini AI は月間回数を消費します。
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => void applyRuleInstruction("simple")}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-50"
                  >
                    説明を自動作成（無料）
                  </button>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => handleAiPolish("simple")}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 disabled:opacity-50"
                  >
                    <Sparkles size={12} /> AI Gemini（かんたん）
                  </button>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => handleAiPolish("manual")}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
                  >
                    AI（業務文書風）
                  </button>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => handleAiPolish("formal")}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
                  >
                    AI（丁寧）
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">手順の種類</label>
                <select
                  value={active.type}
                  onChange={(e) => patchActive({ type: e.target.value as StepType })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="normal">通常</option>
                  <option value="warning">注意</option>
                  <option value="ng_example">NG例（やってはいけない）</option>
                  <option value="check">確認ポイント</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">注意メモ</label>
                <input
                  value={draft.note}
                  onChange={(e) => updateDraft({ note: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">画面編集</p>
                <p className="mt-0.5 text-[11px] text-slate-400">黒塗り・モザイク・ぼかし・丸・矢印・テキスト（保存後は画像に焼き込み）</p>
                <button
                  type="button"
                  disabled={!active.screenshotUrl}
                  onClick={() => setScreenEditOpen(true)}
                  className="mt-2 w-full rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-100 disabled:opacity-40"
                >
                  全画面で画面編集を開く
                </button>
              </div>
              {screenEditOpen && active.screenshotUrl && id && (
                <StepScreenEditor
                  screenshotUrl={active.screenshotUrl}
                  manualId={id}
                  stepId={active.id}
                  masks={active.masks ?? []}
                  annotations={active.annotations ?? []}
                  onSave={(result) => {
                    void patchActive({
                      screenshotUrl: result.screenshotUrl,
                      masks: result.masks,
                      annotations: result.annotations,
                    });
                    setScreenEditOpen(false);
                  }}
                  onClose={() => setScreenEditOpen(false)}
                />
              )}
              {aiBusy && <p className="text-xs text-slate-400">AI生成中…</p>}
            </div>
          ) : null}
        </section>
      </div>

      {id && !id.startsWith("demo") && (
        <div className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            className="text-xs text-danger-600 hover:underline"
            onClick={async () => {
              if (!confirm("マニュアルを削除しますか？")) return;
              await deleteManual(id);
              navigate("/dashboard");
            }}
          >
            このマニュアルを削除
          </button>
        </div>
      )}
    </>
  );
}
