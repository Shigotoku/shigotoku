import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye } from "lucide-react";
import PageHeader from "../components/PageHeader";
import ManualDocumentEditor from "../components/ManualDocumentEditor";
import ManualStepDetailPanel from "../components/ManualStepDetailPanel";
import EditNextStepsBanner from "../components/EditNextStepsBanner";
import IngestedBanner from "../components/IngestedBanner";
import EditToolboxRow from "../components/EditToolboxRow";
import {
  applyUiLayoutToSteps,
  deleteManual,
  deleteStep,
  duplicateManual,
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
import { syncExtensionSession, pingExtension } from "../lib/extensionBridge";
import { uploadStepScreenshot } from "../lib/uploadStepScreenshot";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { manualWorkStatus, WORK_STATUS_LABEL } from "../lib/manualWorkStatus";
import { getUiLayoutTemplate, stepFieldsFromLayout, type UiLayoutId } from "../lib/uiLayoutTemplates";
import UiLayoutPicker from "../components/UiLayoutPicker";
import type { Manual, ManualStep, ManualWorkStatus, TargetAudience } from "../types";

export default function ManualEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailStepId = searchParams.get("detail");
  const { organization } = useOrg();
  const { user } = useAuth();
  const [manual, setManual] = useState<Manual | null>(null);
  const [steps, setSteps] = useState<ManualStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [extSynced, setExtSynced] = useState(false);
  const [extMsg, setExtMsg] = useState("");
  const [extInstalled, setExtInstalled] = useState<boolean | null>(null);
  const [polishVoiceWithAi, setPolishVoiceWithAi] = useState(false);
  const [generateAllWithAi, setGenerateAllWithAi] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);
  const [layoutBusy, setLayoutBusy] = useState(false);

  useEffect(() => {
    pingExtension().then(setExtInstalled);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "CLIPIT_SYNC_OK") {
        setExtSynced(true);
        setExtMsg("拡張と連携しました。業務サイトのタブで「記録開始」を押してください。");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
      setTitleDraft("デモマニュアル");
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
    setTitleDraft(m.title);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("ingested") === "1" && id && !id.startsWith("demo")) {
      void load();
    }
  }, [searchParams, id, load]);

  const openDetail = (stepId: string) => {
    setSearchParams({ detail: stepId });
  };

  const closeDetail = () => {
    setSearchParams({});
  };

  const saveStepFields = async (stepId: string, fields: { title: string; instruction: string; note: string }) => {
    if (!id || id.startsWith("demo")) return;
    await updateStep(id, stepId, fields);
    setSteps((cur) => cur.map((s) => (s.id === stepId ? { ...s, ...fields } : s)));
  };

  const patchStep = async (stepId: string, patch: Partial<ManualStep>) => {
    if (!id || id.startsWith("demo")) return;
    await updateStep(id, stepId, patch);
    setSteps((cur) => cur.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
  };

  const saveTitle = async () => {
    if (!id || id.startsWith("demo") || !manual) return;
    const next = titleDraft.trim() || "無題のマニュアル";
    if (next === manual.title) return;
    setTitleSaving(true);
    try {
      await updateManual(id, { title: next });
      setManual({ ...manual, title: next });
      setTitleDraft(next);
    } finally {
      setTitleSaving(false);
    }
  };

  const changeUiLayout = async (layoutId: UiLayoutId) => {
    if (!id || id.startsWith("demo") || !manual) return;
    if (layoutId === manual.uiLayoutId && steps.some((s) => s.imageWidthPct != null)) return;
    setLayoutBusy(true);
    try {
      await applyUiLayoutToSteps(id, layoutId, { forceLayout: true });
      await load();
    } finally {
      setLayoutBusy(false);
    }
  };

  const active = steps.find((s) => s.id === detailStepId) ?? steps[0];
  const audience = (manual?.targetAudience?.[0] ?? "new_staff") as TargetAudience;

  const moveStep = async (stepId: string, dir: -1 | 1) => {
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

  const insertStep = async (mode: "end" | "before" | "after") => {
    if (!id || id.startsWith("demo") || !active) return;
    let position = steps.length + 1;
    if (mode === "before") position = active.order;
    if (mode === "after") position = active.order + 1;
    const layoutFields = stepFieldsFromLayout(manual?.uiLayoutId);
    const newId = await insertStepAt(id, position, {
      type: layoutFields.type ?? "normal",
      title: `手順 ${position}`,
      instruction: "",
      note: layoutFields.note ?? "",
      textBeforeImage: layoutFields.textBeforeImage ?? "",
      screenshotUrl: "",
      pageTitle: "",
      pageUrl: "",
      elementText: "",
      imageWidthPct: layoutFields.imageWidthPct,
      imageAlign: layoutFields.imageAlign,
    });
    await load();
    openDetail(newId);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!id || !confirm("この手順を削除しますか？")) return;
    if (id.startsWith("demo")) return;
    await deleteStep(id, stepId);
    const next = steps.filter((s) => s.id !== stepId);
    setSteps(next);
    if (detailStepId === stepId) {
      if (next[0]) openDetail(next[0].id);
      else closeDetail();
    }
  };

  const applyRuleInstruction = async (tone: "simple" | "formal" | "manual" = "simple") => {
    if (!active || !id) return;
    const text = buildInstructionFromStep(active, tone, audience);
    await patchStep(active.id, { instruction: text });
  };

  const handleAiPolish = async (tone: "simple" | "formal" | "manual" | "detailed") => {
    if (!active || !id) return;
    setAiBusy(true);
    try {
      const orgId = manual?.organizationId;
      if (!orgId || orgId === "demo") return;
      const text = await generateStepWithApi(active, tone, audience, orgId).catch(() =>
        polishInstruction(active, tone === "manual" || tone === "detailed" ? "formal" : tone === "formal" ? "formal" : "simple"),
      );
      await patchStep(active.id, { instruction: text });
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
    setExtMsg("");
    const installed = await pingExtension();
    setExtInstalled(installed);
    if (!installed) {
      setExtMsg("Chrome拡張が見つかりません。メニュー「Chrome拡張」からインストール手順を確認してください。");
      return;
    }
    const ok = await syncExtensionSession(id, { polishVoiceWithAi, generateAllWithAi });
    if (ok) {
      setExtMsg("連携信号を送信しました…");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
      </div>
    );
  }

  if (!manual || !id) return null;

  const inDetail = Boolean(detailStepId && steps.some((s) => s.id === detailStepId));

  return (
    <>
      <PageHeader
        title={titleDraft.trim() || manual.title}
        editableTitle={
          id && !id.startsWith("demo")
            ? {
                value: titleDraft,
                onChange: setTitleDraft,
                onSave: () => void saveTitle(),
                saving: titleSaving,
              }
            : undefined
        }
        description={inDetail ? "手順の詳細編集（画面編集・AI・画像差し替え）" : "Wordのように手順を並べて編集（クリックで詳細編集）"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {id && !id.startsWith("demo") && (
              <Link
                to={`/manuals/${id}/preview`}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye size={16} /> 書き出し・印刷
              </Link>
            )}
            <Link to={`/manuals/${id}/share`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              共有へ
            </Link>
            {user && (
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={async () => {
                  if (id.startsWith("demo")) return;
                  const label = prompt("新しい版の名前（例: 2027年度版）", `${manual.title}（改訂版）`);
                  if (!label?.trim()) return;
                  const newId = await duplicateManual(id, {
                    title: label.trim(),
                    editionLabel: label.trim(),
                    createdBy: user.uid,
                  });
                  navigate(`/manuals/${newId}/edit`);
                }}
              >
                改訂版を複製
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                if (id.startsWith("demo")) return;
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

      {id && !id.startsWith("demo") && manual.uiLayoutId && !inDetail && (
        <div className="mx-6 mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-900">UIのひな型（レイアウト）</p>
              <p className="text-xs text-slate-500">
                現在: {getUiLayoutTemplate(manual.uiLayoutId).name}
                {layoutBusy && " · 適用中…"}
              </p>
            </div>
            <p className="text-[11px] text-slate-400">変更すると全手順の画像配置・注意欄の型が更新されます</p>
          </div>
          <UiLayoutPicker
            value={(manual.uiLayoutId as UiLayoutId) ?? "standard-vertical"}
            onChange={(next) => void changeUiLayout(next)}
            compact
          />
        </div>
      )}

      {id && !id.startsWith("demo") && <EditNextStepsBanner manualId={id} stepCount={steps.length} />}
      {id && !id.startsWith("demo") && (
        <IngestedBanner
          stepCount={steps.length}
          firstStepId={steps[0]?.id}
          aiApplied={searchParams.get("ai") === "1"}
          onRunAiAll={handleAiAll}
          aiBusy={aiBusy}
        />
      )}

      {manual?.creationSource === "template" && !inDetail && (
        <div className="mx-6 mb-4 rounded-xl border border-primary-200 bg-primary-50/50 px-4 py-3 text-sm text-primary-900">
          <strong>テンプレートから作成しました。</strong>
          プレースホルダー画像を実際の画面スクショに差し替え、説明文を現場に合わせて直してください。
        </div>
      )}

      {id && !id.startsWith("demo") && manual && (
        <div className="mx-6 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">作成状態</span>
          {(["in_progress", "completed"] as ManualWorkStatus[]).map((ws) => (
            <button
              key={ws}
              type="button"
              onClick={async () => {
                await updateManual(id, { workStatus: ws });
                setManual({ ...manual, workStatus: ws });
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                manualWorkStatus(manual) === ws ? "bg-primary-500 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {WORK_STATUS_LABEL[ws]}
            </button>
          ))}
        </div>
      )}

      {manual && !inDetail && (
        <EditToolboxRow
          manual={manual}
          steps={steps}
          extSynced={extSynced}
          extInstalled={extInstalled}
          extMsg={extMsg}
          polishVoiceWithAi={polishVoiceWithAi}
          generateAllWithAi={generateAllWithAi}
          aiBusy={aiBusy}
          onExtensionSync={handleExtensionSync}
          onPolishVoiceChange={setPolishVoiceWithAi}
          onGenerateAllWithAiChange={setGenerateAllWithAi}
          onAiAll={handleAiAll}
          showExtension={Boolean(id && !id.startsWith("demo"))}
        />
      )}

      {inDetail && detailStepId ? (
        <ManualStepDetailPanel
          manualId={id}
          manual={manual}
          steps={steps}
          activeId={detailStepId}
          onBack={closeDetail}
          onStepsChange={setSteps}
          onActiveChange={openDetail}
          onReload={load}
          saveStepFields={saveStepFields}
          patchStep={patchStep}
          moveStep={moveStep}
          reorderByDrag={reorderByDrag}
          insertStep={insertStep}
          deleteStep={handleDeleteStep}
          applyRuleInstruction={applyRuleInstruction}
          handleAiPolish={handleAiPolish}
          uploadScreenshot={async (file) => {
            if (!active) return;
            const url = await uploadStepScreenshot(id, active.id, file);
            await patchStep(active.id, { screenshotUrl: url });
          }}
          aiBusy={aiBusy}
          organization={organization}
        />
      ) : (
        <ManualDocumentEditor
          manualId={id}
          manual={manual}
          displayTitle={titleDraft.trim() || manual.title}
          steps={steps}
          onStepsChange={setSteps}
          onOpenDetail={openDetail}
          onReload={load}
          demo={id.startsWith("demo")}
        />
      )}

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
