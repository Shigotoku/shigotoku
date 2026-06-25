import { useEffect, useState } from "react";
import { AlertTriangle, Check, History, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageHelpTip from "../components/PageHelpTip";
import BulkUpdateScopePicker, { type BulkScope, manualsInScope } from "../components/BulkUpdateScopePicker";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { effectivePlanId } from "../lib/internalAccess";
import { planFeatures } from "../lib/plans";
import type { PlanId } from "../types";
import { listManuals } from "../services/manuals";
import { listFolders } from "../services/folders";
import {
  applyBulkChanges,
  listBulkBatches,
  proposeBulkChanges,
  rollbackBulkBatch,
  scanBulkMatches,
  type BulkBatch,
  type BulkChangeProposal,
  type BulkUpdateScope,
} from "../services/bulkUpdate";
import type { Manual, ManualFolder } from "../types";

const PRESETS = [
  "会社名・外注先を変更したい",
  "問い合わせ先・メールアドレスを変更したい",
  "操作画面・システム名が変わった",
  "料金・受付時間を変更したい",
  "古い表現をやさしい日本語に直したい",
];

export default function BulkUpdatePage() {
  const { organization } = useOrg();
  const { user, demoMode } = useAuth();
  const planId = organization
    ? effectivePlanId(organization.plan as PlanId, user?.email)
    : ("free" as PlanId);
  const bulkAiEnabled = planFeatures(planId).bulkUpdateAi;
  const [instruction, setInstruction] = useState("");
  const [keyword, setKeyword] = useState("");
  const [replaceFrom, setReplaceFrom] = useState("");
  const [replaceTo, setReplaceTo] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [proposals, setProposals] = useState<BulkChangeProposal[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [batches, setBatches] = useState<BulkBatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [folders, setFolders] = useState<ManualFolder[]>([]);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [scope, setScope] = useState<BulkScope>({
    mode: "all",
    folderIds: [],
    manualIds: [],
    includeUncategorized: true,
  });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const apiScope = (): BulkUpdateScope | undefined =>
    scope.mode === "all"
      ? undefined
      : {
          mode: "selected",
          folderIds: scope.folderIds,
          manualIds: scope.manualIds,
          includeUncategorized: scope.includeUncategorized,
        };

  const loadHistory = async () => {
    if (!organization || demoMode) return;
    const { batches: b } = await listBulkBatches(organization.id);
    setBatches(b);
  };

  useEffect(() => {
    loadHistory().catch(() => {});
  }, [organization?.id, demoMode]);

  useEffect(() => {
    if (!organization?.id || demoMode) return;
    Promise.all([listManuals(organization.id), listFolders(organization.id)]).then(([ms, fs]) => {
      setManuals(ms);
      setFolders(fs);
    });
  }, [organization?.id, demoMode]);

  const searchOnly = async () => {
    if (!organization || !keyword.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { matches, count } = await scanBulkMatches(organization.id, keyword.trim(), apiScope());
      setMatchCount(count);
      setProposals(
        matches.map((m) => ({
          manualId: m.manualId,
          manualTitle: m.manualTitle,
          stepId: m.stepId,
          stepOrder: m.stepOrder,
          stepTitle: m.stepTitle,
          field: m.field,
          before: m.before,
          after: m.before,
          risk: "low" as const,
          requiresScreenshotUpdate: false,
        })),
      );
      setMsg(`${count} 件見つかりました（検索のみ）`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const findChanges = async () => {
    if (!organization || !instruction.trim()) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const result = await proposeBulkChanges({
        organizationId: organization.id,
        instruction: instruction.trim(),
        keyword: keyword.trim() || undefined,
        replaceFrom: replaceFrom.trim() || undefined,
        replaceTo: replaceTo,
        useAi: useAi && !demoMode,
        scope: apiScope(),
      });
      setProposals(result.proposals.map((p) => ({ ...p, excluded: false })));
      setMatchCount(result.matchCount);
      setMsg(`変更候補 ${result.proposals.length} 件（検索 ${result.matchCount} 件）`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleExclude = (idx: number) => {
    setProposals((cur) =>
      cur.map((p, i) => (i === idx ? { ...p, excluded: !p.excluded } : p)),
    );
  };

  const apply = async () => {
    if (!organization || !instruction.trim()) return;
    const active = proposals.filter((p) => !p.excluded);
    if (!active.length) return;
    if (!confirm(`${active.length} 件の変更を適用します。よろしいですか？`)) return;
    setBusy(true);
    setError("");
    try {
      const result = await applyBulkChanges({
        organizationId: organization.id,
        instruction: instruction.trim(),
        changes: active,
      });
      setMsg(`適用しました（${result.appliedCount} 件）。バッチ ID: ${result.batchId}`);
      setProposals([]);
      await loadHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const rollback = async (batchId: string) => {
    if (!organization || !confirm("この一括変更を元に戻しますか？")) return;
    setBusy(true);
    try {
      const { restored } = await rollbackBulkBatch(batchId, organization.id);
      setMsg(`${restored} 件を元に戻しました`);
      await loadHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const activeCount = proposals.filter((p) => !p.excluded).length;

  return (
    <>
      <PageHeader
        title="まとめて修正"
        description="複数のマニュアルを横断して検索・AIで文脈修正・一括適用（適用前に必ず確認）"
      />
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <PageHelpTip title="まとめて修正の使い方">
          まず「スキャン」で対象を確認 → 変更案を確認 → 問題なければ「適用」。
          元に戻したい場合は履歴からロールバックできます。
        </PageHelpTip>

        <p className="rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-3 text-sm text-slate-700">
          <strong>一度作ったマニュアルを、ずっと新しく。</strong>
          契約先・システム名・問い合わせ先が変わっても、全マニュアルを1つずつ開かずに更新できます。
          AIは勝手に反映せず、変更前後を確認してから適用します。
        </p>

        {error && <p className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">{error}</p>}
        {msg && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</p>}

        {!demoMode && manuals.length > 0 && (
          <BulkUpdateScopePicker
            folders={folders}
            manuals={manuals}
            scope={scope}
            onChange={setScope}
            expandedFolders={expandedFolders}
            onToggleFolderExpand={(id) =>
              setExpandedFolders((cur) => {
                const next = new Set(cur);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
          />
        )}
        {scope.mode === "selected" && manuals.length > 0 && (
          <p className="text-xs text-slate-500">
            選択範囲: {manualsInScope(manuals, scope).map((m) => m.title).join("、") || "（なし）"}
          </p>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">何を変更しますか？</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInstruction(p)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-primary-300 hover:bg-primary-50"
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={4}
            placeholder={`例：「旧予約システム」を「新予約システム」に変更してください。関連する説明文も自然に直してください。スクショに旧画面が残っている場合は差し替え候補として表示してください。`}
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="検索キーワード（任意）"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
            />
            <input
              value={replaceFrom}
              onChange={(e) => setReplaceFrom(e.target.value)}
              placeholder="置換元（任意）"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
            />
            <input
              value={replaceTo}
              onChange={(e) => setReplaceTo(e.target.value)}
              placeholder="置換先（任意）"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
            />
          </div>
          {!bulkAiEnabled && (
            <p className="mt-2 text-xs text-amber-800">
              AI一括修正はスタンダードプラン以上で利用できます。オフの場合はキーワード置換のみ実行されます。
            </p>
          )}
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={useAi && bulkAiEnabled}
              disabled={!bulkAiEnabled}
              onChange={(e) => setUseAi(e.target.checked)}
            />
            AIで文脈理解型の修正（オフ時は単純置換のみ）
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || !keyword.trim() || demoMode}
              onClick={searchOnly}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              <Search size={16} /> 横断検索のみ
            </button>
            <button
              type="button"
              disabled={busy || !instruction.trim() || demoMode}
              onClick={findChanges}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              変更候補を探す
            </button>
          </div>
          {matchCount > 0 && <p className="mt-2 text-xs text-slate-500">検索ヒット: {matchCount} 件</p>}
        </section>

        {proposals.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">
              変更候補（{activeCount} / {proposals.length} 件を適用予定）
            </h2>
            <div className="mt-4 space-y-4">
              {proposals.map((p, i) => (
                <div
                  key={`${p.manualId}-${p.stepId}-${p.field}-${i}`}
                  className={`rounded-xl border p-4 ${p.excluded ? "border-slate-100 bg-slate-50 opacity-60" : "border-slate-200"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {p.manualTitle}
                        {p.stepOrder != null && ` / 手順${p.stepOrder}`}
                        {p.stepTitle && ` — ${p.stepTitle}`}
                      </p>
                      <p className="text-xs text-slate-500">{p.field}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.risk === "high" && (
                        <span className="rounded-full bg-danger-100 px-2 py-0.5 text-[10px] font-bold text-danger-700">
                          要確認
                        </span>
                      )}
                      {p.requiresScreenshotUpdate && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          スクショ要確認
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExclude(i)}
                        className="text-xs font-semibold text-primary-600"
                      >
                        {p.excluded ? "含める" : "除外"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-red-50/50 p-3">
                      <p className="text-[10px] font-bold text-slate-500">変更前</p>
                      <p className="mt-1 text-slate-700">{p.before}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50/50 p-3">
                      <p className="text-[10px] font-bold text-slate-500">変更後</p>
                      <p className="mt-1 text-slate-700">{p.after}</p>
                    </div>
                  </div>
                  {p.reason && <p className="mt-2 text-xs text-slate-500">{p.reason}</p>}
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={busy || activeCount === 0 || demoMode}
              onClick={apply}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Check size={18} />
              {activeCount} 件を一括適用する
            </button>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <History size={16} /> 一括更新の履歴
          </h2>
          {batches.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">まだ履歴がありません。</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {batches.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{b.instruction.slice(0, 60)}…</p>
                    <p className="text-xs text-slate-500">
                      適用 {b.appliedCount} 件 · {b.status === "rolled_back" ? "元に戻し済み" : "適用済み"}
                    </p>
                  </div>
                  {b.status === "applied" && (
                    <button
                      type="button"
                      disabled={busy || demoMode}
                      onClick={() => rollback(b.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"
                    >
                      <RefreshCw size={14} /> 元に戻す
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            医療・法務・労務に関わる変更は「要確認」ラベルを確認し、適用後は編集画面の健康診断で最終チェックしてください。
          </p>
        </section>
      </div>
    </>
  );
}
