import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useCompanyStore, PHASE_LABELS, type StartupPhase } from "../../store/company";

const industries = [
  "IT・テクノロジー", "医療・ヘルスケア", "教育・学習", "飲食・フード",
  "不動産", "金融・フィンテック", "EC・小売", "コンサルティング", "製造", "その他",
];

export default function NewCompanyPage() {
  const navigate = useNavigate();
  const { user, isDemo } = useAuthStore();
  const { setCompany, createCompanyInDB } = useCompanyStore();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phase, setPhase] = useState<StartupPhase>("idea");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError("");
    setSaving(true);

    const data = {
      name, nameKana: "", industry, phase,
      isMedicalMode: false, medicalFields: [],
      foundedDate: null, postalCode: "", address: "",
      representativeName: "", capitalAmount: 0,
      employeeCount: 1, description,
    };

    try {
      if (isDemo || !user) {
        setCompany({ ...data, id: `company-${Date.now()}` });
      } else {
        await createCompanyInDB(user.id, data);
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "会社の作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">新しい会社を追加</h1>
          <p className="text-sm text-slate-500">複数の会社・プロジェクトを管理できます</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-primary-600" />
          <h2 className="text-base font-bold text-slate-900">基本情報</h2>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">会社名 / プロジェクト名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 株式会社〇〇"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">業種</label>
          <div className="flex flex-wrap gap-2">
            {industries.map((ind) => (
              <button
                key={ind}
                onClick={() => setIndustry(ind)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  industry === ind ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">フェーズ</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.entries(PHASE_LABELS) as [StartupPhase, string][]).slice(0, 6).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPhase(key)}
                className={`rounded-xl border-2 px-3 py-2 text-left text-xs font-medium transition-all ${
                  phase === key ? "border-primary-400 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">事業概要（任意）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="事業の概要を簡単に"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>会社を作成<ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  );
}
