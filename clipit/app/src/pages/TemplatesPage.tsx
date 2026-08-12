import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FileText, LayoutGrid, Search } from "lucide-react";
import { appendCreateQuery, folderIdFromSearch } from "../lib/folderContext";
import { resolveTocEnabled } from "../lib/manualToc";
import {
  getUiLayoutTemplate,
  persistUiLayoutId,
  resolveUiLayoutId,
  type UiLayoutId,
} from "../lib/uiLayoutTemplates";
import PageHeader from "../components/PageHeader";
import UiLayoutDiagram from "../components/UiLayoutDiagram";
import UiLayoutPicker from "../components/UiLayoutPicker";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { addStep, applyUiLayoutToSteps, createManual } from "../services/manuals";
import {
  MANUAL_TEMPLATES,
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_SCOPE_LABELS,
  recommendedCategoriesForOrg,
  type ManualTemplate,
  type TemplateCategory,
  type TemplateScope,
} from "../services/templates";

const ALL = "all" as const;
const SCOPE_ALL = "all" as const;

const CATEGORY_ICON: Record<TemplateCategory, string> = {
  clinic: "🏥",
  education: "📚",
  smb: "🏢",
  web: "🌐",
  hospitality: "☕",
  general: "📋",
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetFolderId = folderIdFromSearch(searchParams);
  const [uiLayoutId, setUiLayoutId] = useState<UiLayoutId>(() => resolveUiLayoutId(searchParams));
  const tocEnabled = resolveTocEnabled(searchParams);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const { organization } = useOrg();
  const { user, demoMode } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<typeof SCOPE_ALL | TemplateScope>(SCOPE_ALL);
  const [category, setCategory] = useState<typeof ALL | TemplateCategory>(ALL);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list: ManualTemplate[] = MANUAL_TEMPLATES;
    if (scope !== SCOPE_ALL) list = list.filter((t) => t.scope === scope);
    if (category !== ALL) list = list.filter((t) => t.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [scope, category, query]);

  const recommended = useMemo(() => {
    const cats = recommendedCategoriesForOrg(organization?.type);
    const picked: ManualTemplate[] = [];
    for (const cat of cats) {
      for (const t of MANUAL_TEMPLATES) {
        if (t.category === cat && !picked.some((p) => p.id === t.id)) {
          picked.push(t);
        }
        if (picked.length >= 6) break;
      }
      if (picked.length >= 6) break;
    }
    return picked;
  }, [organization?.type]);

  const scopeCounts = useMemo(() => {
    const company = MANUAL_TEMPLATES.filter((t) => t.scope === "company").length;
    const personal = MANUAL_TEMPLATES.filter((t) => t.scope === "personal").length;
    return { company, personal, all: MANUAL_TEMPLATES.length };
  }, []);

  const handleLayoutChange = (id: UiLayoutId) => {
    persistUiLayoutId(id);
    setUiLayoutId(id);
    const next = new URLSearchParams(searchParams);
    next.set("layout", id);
    setSearchParams(next, { replace: true });
  };

  const currentLayout = getUiLayoutTemplate(uiLayoutId);

  const useTemplate = async (templateId: string) => {
    const tpl = MANUAL_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setError("");
    if (demoMode) {
      navigate("/manuals/demo-1/edit");
      return;
    }
    if (!organization || !user) {
      setError("ログインと組織の読み込みが完了してからお試しください。");
      return;
    }
    setBusy(templateId);
    try {
      const id = await createManual({
        organizationId: organization.id,
        title: tpl.title,
        targetAudience: tpl.targetAudience,
        createdBy: user.uid,
        description: tpl.description,
        category: tpl.category,
        contentType: tpl.category === "education" ? "material" : "manual",
        creationSource: "template",
        folderId: presetFolderId,
        uiLayoutId,
        tocEnabled,
      });
      for (let i = 0; i < tpl.steps.length; i++) {
        const s = tpl.steps[i]!;
        await addStep(id, {
          order: i + 1,
          type: s.type,
          title: s.title,
          instruction: s.instruction,
          note: s.note ?? "",
          screenshotUrl: s.screenshotUrl ?? "",
          clickX: s.clickX,
          clickY: s.clickY,
          pageTitle: tpl.title,
          pageUrl: "",
          elementText: "",
        });
      }
      await applyUiLayoutToSteps(id, uiLayoutId, { forceLayout: true });
      navigate(`/manuals/${id}/edit?new=1`);
    } catch (e) {
      const msg = (e as Error).message ?? "テンプレートからの作成に失敗しました";
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="内容のひな型"
        description="業務の型・手順文・補足が入ったテンプレートです。見た目（UIレイアウト）は下で選んだものが適用されます"
      />
      <div className="space-y-4 p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-full max-w-[140px] shrink-0">
              <UiLayoutDiagram layoutId={uiLayoutId} selected />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <LayoutGrid size={16} className="text-primary-500" />
                <p className="text-xs font-semibold text-slate-500">選択中のUIレイアウト（見た目）</p>
              </div>
              <p className="mt-1 text-base font-bold text-slate-900">{currentLayout.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                内容テンプレートとは別です。作成時に手順の配置・画像サイズへ反映されます。
              </p>
              <button
                type="button"
                onClick={() => setShowLayoutPicker((v) => !v)}
                className="mt-2 text-xs font-semibold text-primary-600 hover:underline"
              >
                {showLayoutPicker ? "UIレイアウト選択を閉じる" : "別のUIレイアウトを選ぶ"}
              </button>
              <span className="mx-2 text-xs text-slate-300">|</span>
              <Link
                to={appendCreateQuery("/manuals/new", presetFolderId, uiLayoutId)}
                className="text-xs font-semibold text-primary-600 hover:underline"
              >
                作り方選択に戻る
              </Link>
            </div>
          </div>
          {showLayoutPicker && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <UiLayoutPicker value={uiLayoutId} onChange={handleLayoutChange} compact />
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            <p>{error}</p>
            {error.includes("プラン") && (
              <p className="mt-2">
                <Link to="/settings" className="font-semibold underline">
                  設定画面
                </Link>
                でプランを確認するか、来月までお待ちください。
              </p>
            )}
          </div>
        )}

        {!query.trim() && category === ALL && scope === SCOPE_ALL && recommended.length > 0 && (
          <section className="rounded-2xl border border-primary-200 bg-primary-50/40 p-5">
            <h2 className="text-sm font-bold text-primary-900">あなたの組織向けおすすめ</h2>
            <p className="mt-1 text-xs text-primary-800/80">
              設定した業種（{organization?.type === "clinic" ? "クリニック" : organization?.type === "developer" ? "開発者" : organization?.type === "agency" ? "代理店" : organization?.type === "startup" ? "スタートアップ" : "中小企業"}）に合うテンプレートです
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
              {recommended.map((t) => (
                <button
                  key={`rec-${t.id}`}
                  type="button"
                  disabled={busy === t.id}
                  onClick={() => void useTemplate(t.id)}
                  className="flex min-w-0 flex-col items-center rounded-xl border border-primary-200 bg-white p-3 text-left transition-all hover:border-primary-400 hover:shadow-sm disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-xl">
                    {CATEGORY_ICON[t.category]}
                  </span>
                  <span className="mt-2 line-clamp-2 w-full text-center text-xs font-semibold leading-snug text-slate-800">
                    {t.title}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScope(SCOPE_ALL)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
              scope === SCOPE_ALL ? "border-primary-400 bg-primary-50 text-primary-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            📁 すべて（{scopeCounts.all}）
          </button>
          <button
            type="button"
            onClick={() => setScope("company")}
            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
              scope === "company" ? "border-primary-400 bg-primary-50 text-primary-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            🏢 {TEMPLATE_SCOPE_LABELS.company}（{scopeCounts.company}）
          </button>
          <button
            type="button"
            onClick={() => setScope("personal")}
            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
              scope === "personal" ? "border-primary-400 bg-primary-50 text-primary-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            👤 {TEMPLATE_SCOPE_LABELS.personal}（{scopeCounts.personal}）
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="テンプレートを検索…"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-4 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory(ALL)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                category === ALL ? "bg-primary-500 text-white" : "border border-slate-200 text-slate-600"
              }`}
            >
              すべて
            </button>
            {(Object.keys(TEMPLATE_CATEGORY_LABELS) as TemplateCategory[]).map((cat) => {
              const n = MANUAL_TEMPLATES.filter((t) => t.category === cat).length;
              if (!n) return null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    category === cat ? "bg-primary-500 text-white" : "border border-slate-200 text-slate-600"
                  }`}
                >
                  {TEMPLATE_CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {/* フォルダ風コンパクトグリッド */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={busy === t.id}
              onClick={() => void useTemplate(t.id)}
              className="group flex min-w-0 flex-col items-center rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-primary-300 hover:bg-primary-50/40 hover:shadow-sm disabled:opacity-50"
              title={t.description}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-2xl group-hover:bg-primary-100">
                {CATEGORY_ICON[t.category]}
              </span>
              <span className="mt-2 line-clamp-2 w-full text-center text-xs font-semibold leading-snug text-slate-800">
                {t.title}
              </span>
              <span className="mt-1 text-[10px] text-slate-400">
                {t.steps.length}手順 · {TEMPLATE_SCOPE_LABELS[t.scope]} · {TEMPLATE_CATEGORY_LABELS[t.category]}
              </span>
              {busy === t.id && (
                <span className="mt-1 text-[10px] font-semibold text-primary-600">作成中…</span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-500">該当するテンプレートがありません。</p>
        )}

        <p className="text-center text-xs text-slate-400">
          <FileText size={12} className="mr-1 inline" />
          内容のひな型を選ぶと、手順の説明文・補足・画面イメージが入った状態で編集画面が開きます。実際のスクショに差し替えれば完成です。
        </p>
      </div>
    </>
  );
}
