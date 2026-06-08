import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ImageIcon, Search } from "lucide-react";
import { folderIdFromSearch } from "../lib/folderContext";
import PageHeader from "../components/PageHeader";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { createManual, addStep } from "../services/manuals";
import {
  MANUAL_TEMPLATES,
  TEMPLATE_CATEGORY_LABELS,
  type ManualTemplate,
  type TemplateCategory,
} from "../services/templates";

const ALL = "all" as const;

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFolderId = folderIdFromSearch(searchParams);
  const { organization } = useOrg();
  const { user, demoMode } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [category, setCategory] = useState<typeof ALL | TemplateCategory>(ALL);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list: ManualTemplate[] = MANUAL_TEMPLATES;
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
  }, [category, query]);

  const useTemplate = async (templateId: string) => {
    const tpl = MANUAL_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    if (demoMode) {
      navigate("/manuals/demo-1/edit");
      return;
    }
    if (!organization || !user) return;
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
      });
      for (let i = 0; i < tpl.steps.length; i++) {
        const s = tpl.steps[i]!;
        await addStep(id, {
          order: i + 1,
          type: s.type,
          title: s.title,
          instruction: s.instruction,
          note: "",
          screenshotUrl: "",
          pageTitle: "",
          pageUrl: "",
          elementText: "",
        });
      }
      navigate(`/manuals/${id}/edit`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="テンプレート"
        description="ひな形を選び、編集画面でスクショを入れるだけでマニュアルが完成します"
      />
      <div className="space-y-4 p-6">
        <p className="rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-3 text-sm text-slate-700">
          <ImageIcon size={16} className="mr-1 inline text-primary-600" />
          テンプレート作成後、各手順の説明にある
          <strong>【ここにスクショまたは画像を挿入】</strong>
          の位置に画面キャプチャをドラッグ＆ドロップすれば、すぐに公開できるマニュアルになります。
        </p>

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
              すべて ({MANUAL_TEMPLATES.length})
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
                  {TEMPLATE_CATEGORY_LABELS[cat]} ({n})
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <article key={t.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="w-fit rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                {TEMPLATE_CATEGORY_LABELS[t.category]}
              </span>
              <h2 className="mt-3 font-bold text-slate-900">{t.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{t.description}</p>
              <p className="mt-2 text-xs text-primary-700/80">{t.imageHint}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {t.tags.map((tag) => (
                  <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>
              <ul className="mt-3 flex-1 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                {t.steps.map((s, i) => (
                  <li key={i}>
                    {i + 1}. {s.title}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-400">{t.steps.length} 手順</p>
              <button
                type="button"
                disabled={busy === t.id}
                onClick={() => useTemplate(t.id)}
                className="mt-4 w-full rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {busy === t.id ? "作成中…" : "このテンプレートで作る"}
              </button>
            </article>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-500">該当するテンプレートがありません。</p>
        )}
      </div>
    </>
  );
}
