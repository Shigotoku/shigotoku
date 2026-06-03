import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { createManual, addStep } from "../services/manuals";
import { MANUAL_TEMPLATES } from "../services/templates";

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { organization } = useOrg();
  const { user, demoMode } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

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
      <PageHeader title="テンプレート" description="クリニック・中小企業向けのひな形から作成" />
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {MANUAL_TEMPLATES.map((t) => (
          <article key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
              {t.category === "clinic" ? "クリニック" : "中小企業"}
            </span>
            <h2 className="mt-3 font-bold text-slate-900">{t.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{t.description}</p>
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
    </>
  );
}
