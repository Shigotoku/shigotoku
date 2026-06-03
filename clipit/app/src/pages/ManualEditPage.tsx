import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import {
  addStep,
  deleteManual,
  deleteStep,
  getManual,
  listSteps,
  polishInstruction,
  reorderSteps,
  updateManual,
  updateStep,
} from "../services/manuals";
import { generateAllStepsWithApi, generateStepWithApi } from "../services/ai";
import { syncExtensionSession, extensionInstallUrl } from "../lib/extensionBridge";
import StepMaskEditor from "../components/StepMaskEditor";
import StepScreenshotPreview from "../components/StepScreenshotPreview";
import type { Manual, ManualStep, MaskRect, StepType, TargetAudience } from "../types";

export default function ManualEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manual, setManual] = useState<Manual | null>(null);
  const [steps, setSteps] = useState<ManualStep[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [extSynced, setExtSynced] = useState(false);

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
    setActiveId(s[0]?.id ?? null);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const active = steps.find((s) => s.id === activeId) ?? steps[0];

  const patchActive = async (patch: Partial<ManualStep>) => {
    if (!id || !active || id.startsWith("demo")) return;
    setSaving(true);
    await updateStep(id, active.id, patch);
    setSteps((cur) => cur.map((s) => (s.id === active.id ? { ...s, ...patch } : s)));
    setSaving(false);
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

  const handleAddStep = async () => {
    if (!id || id.startsWith("demo")) return;
    const order = steps.length + 1;
    const newId = await addStep(id, {
      order,
      type: "normal",
      title: `手順 ${order}`,
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

  const handleAiPolish = async (tone: "simple" | "formal" | "manual" | "detailed") => {
    if (!active) return;
    setAiBusy(true);
    try {
      const orgId = manual?.organizationId;
      if (!orgId || orgId === "demo") return;
      const text = await generateStepWithApi(active, tone, audience, orgId).catch(() =>
        polishInstruction(active, tone === "manual" || tone === "detailed" ? "formal" : tone === "formal" ? "formal" : "simple"),
      );
      await patchActive({ instruction: text });
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
        description="手順の並び替え・文言の編集・共有の準備"
        action={
          <div className="flex gap-2">
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
            <Sparkles size={12} /> 全手順をAI生成
          </button>
        </div>
      )}

      <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-0 lg:grid-cols-12">
        {/* ステップ一覧 */}
        <aside className="border-b border-slate-200 bg-white lg:col-span-3 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-bold text-slate-500">手順 ({steps.length})</span>
            <button
              type="button"
              onClick={handleAddStep}
              className="inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-primary-600 hover:bg-primary-50 px-2 py-1"
            >
              <Plus size={14} /> 追加
            </button>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto lg:max-h-none">
            {steps.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={`flex w-full items-start gap-2 border-l-4 px-4 py-3 text-left text-sm transition-colors ${
                    active?.id === s.id
                      ? "border-primary-500 bg-primary-50/80"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="font-medium text-slate-800">{s.title || `手順 ${i + 1}`}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* プレビュー */}
        <section className="border-b border-slate-200 bg-slate-100 p-4 lg:col-span-5 lg:border-b-0 lg:border-r">
          {active ? (
            <div className="mx-auto max-w-md">
              <StepScreenshotPreview
                screenshotUrl={active.screenshotUrl}
                stepIndex={steps.findIndex((s) => s.id === active.id) + 1}
                clickX={active.clickX}
                clickY={active.clickY}
                stepType={active.type}
              />
              <p className="mt-2 text-center text-xs text-slate-500">{active.pageTitle || active.pageUrl || "—"}</p>
            </div>
          ) : (
            <p className="text-center text-sm text-slate-500 py-20">手順を追加してください</p>
          )}
        </section>

        {/* 編集パネル */}
        <section className="bg-white p-4 lg:col-span-4">
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
                  value={active.title}
                  onChange={(e) => patchActive({ title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">説明文</label>
                <textarea
                  rows={5}
                  value={active.instruction}
                  onChange={(e) => patchActive({ instruction: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => handleAiPolish("simple")}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 disabled:opacity-50"
                  >
                    <Sparkles size={12} /> AI（かんたん）
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
                  value={active.note}
                  onChange={(e) => patchActive({ note: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <StepMaskEditor
                masks={active.masks ?? []}
                onChange={(masks: MaskRect[]) => patchActive({ masks })}
              />
              {(saving || aiBusy) && <p className="text-xs text-slate-400">{aiBusy ? "AI生成中…" : "保存中…"}</p>}
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
