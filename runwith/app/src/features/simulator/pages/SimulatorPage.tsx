import { useState, useEffect } from "react";
import { useSimulationStore } from "@/features/simulator/store/simulation";
import { industryPresets } from "@/features/simulator/presets/index";
import type { Industry, CompanyScale, SalesModel } from "@/features/simulator/types/simulation";
import SimDashboard from "./components/SimDashboard";
import SimParams from "./components/SimParams";
import SimGrowth from "./components/SimGrowth";
import SimSensitivity from "./components/SimSensitivity";
import SimValuation from "./components/SimValuation";
import SimInsights from "./components/SimInsights";
import {
  LayoutDashboard,
  SlidersHorizontal,
  TrendingUp,
  BarChart3,
  Diamond,
  Lightbulb,
  Settings,
  ChevronDown,
} from "lucide-react";

const TABS = [
  { id: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { id: "params", label: "パラメータ", icon: SlidersHorizontal },
  { id: "growth", label: "成長分析", icon: TrendingUp },
  { id: "sensitivity", label: "感度・ベンチマーク", icon: BarChart3 },
  { id: "valuation", label: "企業価値", icon: Diamond },
  { id: "insights", label: "インサイト", icon: Lightbulb },
] as const;

type TabId = (typeof TABS)[number]["id"];

const INDUSTRY_OPTIONS: { value: Industry; label: string; icon: string }[] = [
  { value: "medical", label: "医療・クリニック", icon: "🏥" },
  { value: "saas", label: "IT・SaaS", icon: "💻" },
  { value: "manufacturing", label: "製造業", icon: "🏭" },
  { value: "food", label: "飲食業", icon: "🍽️" },
  { value: "retail", label: "小売業", icon: "🛒" },
  { value: "beautySalon", label: "美容サロン", icon: "💇" },
  { value: "fitnessGym", label: "フィットネスジム", icon: "💪" },
  { value: "juku", label: "学習塾", icon: "📚" },
  { value: "taxi", label: "タクシー", icon: "🚕" },
  { value: "general", label: "その他（汎用）", icon: "📋" },
];

const SCALE_OPTIONS: { value: CompanyScale; label: string }[] = [
  { value: "startup", label: "スタートアップ" },
  { value: "small", label: "小企業" },
  { value: "medium", label: "中企業" },
  { value: "enterprise", label: "大企業" },
];

const SALES_OPTIONS: { value: SalesModel; label: string }[] = [
  { value: "direct", label: "直販" },
  { value: "partner", label: "代理店" },
  { value: "hybrid", label: "ハイブリッド" },
];

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [showSetup, setShowSetup] = useState(false);
  const { profile, isOnboarded, setIndustry, setScale, setSalesModel, completeOnboarding, recalculate, result } =
    useSimulationStore();

  useEffect(() => {
    if (!result) recalculate();
  }, []);

  if (!isOnboarded) {
    return <SetupWizard />;
  }

  const currentPreset = industryPresets[profile.industry];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">事業シミュレーション</h1>
          <p className="mt-1 text-sm text-slate-500">
            60ヶ月予測 · 業種別KPI · 感度分析 · 企業価値評価
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            <span>{currentPreset.icon} {currentPreset.label}</span>
            <span className="text-slate-400">|</span>
            <span>{SCALE_OPTIONS.find((s) => s.value === profile.scale)?.label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {showSetup && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">業種</label>
              <select
                value={profile.industry}
                onChange={(e) => { setIndustry(e.target.value as Industry); }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              >
                {INDUSTRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">企業規模</label>
              <select
                value={profile.scale}
                onChange={(e) => setScale(e.target.value as CompanyScale)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              >
                {SCALE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">販売モデル</label>
              <select
                value={profile.salesModel}
                onChange={(e) => setSalesModel(e.target.value as SalesModel)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              >
                {SALES_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200/60 bg-white p-1 shadow-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {result && (
        <div>
          {activeTab === "dashboard" && <SimDashboard result={result} profile={profile} />}
          {activeTab === "params" && <SimParams />}
          {activeTab === "growth" && <SimGrowth result={result} />}
          {activeTab === "sensitivity" && <SimSensitivity result={result} profile={profile} />}
          {activeTab === "valuation" && <SimValuation />}
          {activeTab === "insights" && <SimInsights result={result} />}
        </div>
      )}
    </div>
  );
}

function SetupWizard() {
  const { profile, setIndustry, setScale, setSalesModel, completeOnboarding, recalculate } = useSimulationStore();

  const handleComplete = () => {
    completeOnboarding();
    recalculate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">事業シミュレーション セットアップ</h1>
        <p className="mt-2 text-sm text-slate-500">
          業種と企業規模を選ぶと、最適なプリセット値で分析を開始できます
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">業種を選択</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INDUSTRY_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setIndustry(o.value)}
              className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                profile.industry === o.value
                  ? "border-primary-400 bg-primary-50 text-primary-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <span className="text-lg">{o.icon}</span>
              <p className="mt-1 font-medium">{o.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">企業規模</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SCALE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setScale(o.value)}
              className={`rounded-xl border p-3 text-center text-sm font-medium transition-colors ${
                profile.scale === o.value
                  ? "border-primary-400 bg-primary-50 text-primary-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">販売モデル</h2>
        <div className="grid grid-cols-3 gap-2">
          {SALES_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setSalesModel(o.value)}
              className={`rounded-xl border p-3 text-center text-sm font-medium transition-colors ${
                profile.salesModel === o.value
                  ? "border-primary-400 bg-primary-50 text-primary-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleComplete}
        className="w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-700"
      >
        シミュレーションを開始
      </button>
    </div>
  );
}
