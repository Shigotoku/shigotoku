import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  Stethoscope,
  Briefcase,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import {
  useCompanyStore,
  PHASE_LABELS,
  MEDICAL_FIELD_LABELS,
  type StartupPhase,
  type MedicalField,
} from "../../store/company";

const industries = [
  "IT・テクノロジー",
  "医療・ヘルスケア",
  "教育・学習",
  "飲食・フード",
  "不動産",
  "金融・フィンテック",
  "EC・小売",
  "コンサルティング",
  "製造",
  "その他",
];

export default function CompanySetupPage() {
  const navigate = useNavigate();
  const { user, isDemo } = useAuthStore();
  const { setCompany, createCompanyInDB } = useCompanyStore();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phase, setPhase] = useState<StartupPhase>("idea");
  const [description, setDescription] = useState("");
  const [isMedical, setIsMedical] = useState(false);
  const [medicalFields, setMedicalFields] = useState<MedicalField[]>([]);
  const [representative, setRepresentative] = useState("");
  const [capital, setCapital] = useState("");

  const steps = ["基本情報", "事業内容", "医療モード"];

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return industry.length > 0;
    return true;
  };

  const handleComplete = async () => {
    setError("");
    setSaving(true);

    const companyData = {
      name,
      nameKana: "",
      industry,
      phase,
      isMedicalMode: isMedical,
      medicalFields,
      foundedDate: null,
      postalCode: "",
      address: "",
      representativeName: representative,
      capitalAmount: parseInt(capital) || 0,
      employeeCount: 1,
      description,
    };

    try {
      if (isDemo || !user) {
        setCompany({ ...companyData, id: `company-${Date.now()}` });
      } else {
        await createCompanyInDB(user.id, companyData);
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "会社情報の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">会社情報の設定</h1>
        <p className="mt-1 text-slate-500">
          あなたの会社について教えてください。後から変更できます。
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">会社未設立の方へ：</span>
          後でいつでも登録可能です。まずはダッシュボードからサービスをご体験ください。
        </p>
        <button
          onClick={() => {
            setCompany({
              id: `company-${Date.now()}`,
              name: "マイプロジェクト",
              nameKana: "",
              industry: "",
              phase: "idea",
              isMedicalMode: false,
              medicalFields: [],
              foundedDate: null,
              postalCode: "",
              address: "",
              representativeName: "",
              capitalAmount: 0,
              employeeCount: 1,
              description: "",
            });
            navigate("/dashboard");
          }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          スキップしてダッシュボードへ
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                i < step
                  ? "bg-primary-600 text-white"
                  : i === step
                  ? "bg-primary-100 text-primary-700 ring-2 ring-primary-300"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-sm font-medium ${
                i === step ? "text-slate-900" : "text-slate-400"
              }`}
            >
              {s}
            </span>
            {i < steps.length - 1 && <div className="h-px w-8 bg-slate-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary-600" />
              <h2 className="text-base font-bold text-slate-900">基本情報</h2>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                会社名（またはプロジェクト名）
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 株式会社シゴトク"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                代表者名
              </label>
              <input
                type="text"
                value={representative}
                onChange={(e) => setRepresentative(e.target.value)}
                placeholder="例: 田中太郎"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                資本金（円）
              </label>
              <input
                type="text"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                placeholder="例: 5000000"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                現在のフェーズ
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  Object.entries(PHASE_LABELS) as [StartupPhase, string][]
                )
                  .slice(0, 6)
                  .map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setPhase(key)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition-all ${
                        phase === key
                          ? "border-primary-400 bg-primary-50 text-primary-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-primary-600" />
              <h2 className="text-base font-bold text-slate-900">事業内容</h2>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                業種
              </label>
              <div className="flex flex-wrap gap-2">
                {industries.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => setIndustry(ind)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      industry === ind
                        ? "bg-primary-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                事業概要
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="事業の概要を簡単に記述してください"
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">医療モード</h2>
            </div>
            <p className="text-sm text-slate-500">
              医療・ヘルスケア分野の事業をされている場合、医療モードを有効にすると
              薬機法ナビゲーターなどの専門機能が利用できます。
            </p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 p-4 transition-all hover:border-emerald-300">
              <input
                type="checkbox"
                checked={isMedical}
                onChange={(e) => setIsMedical(e.target.checked)}
                className="h-5 w-5 rounded accent-emerald-600"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">
                  医療モードを有効にする
                </span>
                <p className="text-xs text-slate-500">
                  後から設定画面でも変更できます
                </p>
              </div>
            </label>

            {isMedical && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  関連する分野
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.entries(MEDICAL_FIELD_LABELS) as [
                      MedicalField,
                      string
                    ][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() =>
                        setMedicalFields((prev) =>
                          prev.includes(key)
                            ? prev.filter((f) => f !== key)
                            : [...prev, key]
                        )
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        medicalFields.includes(key)
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </button>
          ) : (
            <div />
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 disabled:opacity-50"
            >
              次へ
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  完了してダッシュボードへ
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
