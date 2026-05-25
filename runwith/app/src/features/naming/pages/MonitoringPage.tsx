import { useState, createElement } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Plus,
  Trash2,
  Bell,
  BellOff,
  Search,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ChevronLeft,
} from "lucide-react";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";

interface MonitoredBrand {
  id: string;
  name: string;
  addedAt: string;
  alertEnabled: boolean;
  lastChecked: string;
  status: "safe" | "warning" | "unchecked";
  findings: Finding[];
}

interface Finding {
  source: string;
  title: string;
  url: string;
  date: string;
  risk: "low" | "medium" | "high";
}

const DEMO_BRANDS: MonitoredBrand[] = [
  {
    id: "1",
    name: "メディトク",
    addedAt: "2026-03-15",
    alertEnabled: true,
    lastChecked: "2026-03-19",
    status: "safe",
    findings: [],
  },
  {
    id: "2",
    name: "外来ワークス",
    addedAt: "2026-03-15",
    alertEnabled: true,
    lastChecked: "2026-03-19",
    status: "warning",
    findings: [
      {
        source: "PR TIMES",
        title: "「外来ケアワークス」新サービスリリースのお知らせ",
        url: "#",
        date: "2026-03-18",
        risk: "medium",
      },
    ],
  },
  {
    id: "3",
    name: "つながるメディカル",
    addedAt: "2026-03-16",
    alertEnabled: true,
    lastChecked: "2026-03-19",
    status: "safe",
    findings: [],
  },
];

const statusConfig = {
  safe: {
    icon: CheckCircle2,
    label: "異常なし",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  warning: {
    icon: AlertTriangle,
    label: "要確認",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  unchecked: {
    icon: Clock,
    label: "未チェック",
    color: "text-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
};

export default function MonitoringPage() {
  const [brands, setBrands] = useCompanyStorageState<MonitoredBrand[]>("runwith-monitoring", DEMO_BRANDS);
  const [newBrandName, setNewBrandName] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const updateBrands = (next: MonitoredBrand[]) => {
    setBrands(next);
  };

  const addBrand = () => {
    if (!newBrandName.trim()) return;
    const newBrand: MonitoredBrand = {
      id: Date.now().toString(),
      name: newBrandName.trim(),
      addedAt: new Date().toISOString().split("T")[0],
      alertEnabled: true,
      lastChecked: "-",
      status: "unchecked",
      findings: [],
    };
    updateBrands([...brands, newBrand]);
    setNewBrandName("");
  };

  const removeBrand = (id: string) => {
    updateBrands(brands.filter((b) => b.id !== id));
    if (selectedBrand === id) setSelectedBrand(null);
  };

  const toggleAlert = (id: string) => {
    updateBrands(brands.map((b) =>
      b.id === id ? { ...b, alertEnabled: !b.alertEnabled } : b
    ));
  };

  const selected = brands.find((b) => b.id === selectedBrand);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/naming" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors">
          <ChevronLeft className="h-4 w-4" />商標取得ステップガイドに戻る
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          ブランド監視
        </h1>
        <p className="mt-2 text-slate-500">
          登録した商標に類似するサービスの出現を継続的にモニタリングします
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">ブランド監視について</p>
            <p className="mt-1 leading-relaxed">
              商標権は「取って終わり」ではありません。第三者が似た名前でサービスを開始していないか定期的にチェックすることが重要です。
              ここに商標名を登録しておけば、PR
              TIMESやアプリストアなどで類似サービスが見つかった場合にアラートを出します。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-900">
              監視リスト
            </h2>

            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addBrand()}
                placeholder="商標名を入力"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm transition-all focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              <button
                onClick={addBrand}
                disabled={!newBrandName.trim()}
                className="shrink-0 rounded-lg bg-primary-600 p-2 text-white transition-all hover:bg-primary-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {brands.map((brand) => {
                const config = statusConfig[brand.status];
                const StatusIcon = config.icon;
                return (
                  <div
                    key={brand.id}
                    onClick={() => setSelectedBrand(brand.id)}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      selectedBrand === brand.id
                        ? "border-primary-300 bg-primary-50 ring-1 ring-primary-200"
                        : `${config.border} ${config.bg} hover:shadow-sm`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${config.color}`} />
                        <span className="text-sm font-semibold text-slate-800">
                          {brand.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAlert(brand.id);
                          }}
                          className="rounded p-1 text-slate-400 transition-colors hover:text-primary-500"
                          title={
                            brand.alertEnabled
                              ? "アラート ON"
                              : "アラート OFF"
                          }
                        >
                          {brand.alertEnabled ? (
                            <Bell className="h-3.5 w-3.5 text-primary-500" />
                          ) : (
                            <BellOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBrand(brand.id);
                          }}
                          className="rounded p-1 text-slate-400 transition-colors hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                      <span>最終チェック: {brand.lastChecked}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${config.bg} ${config.color}`}
                      >
                        {config.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selected.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    登録日: {selected.addedAt}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusConfig[selected.status].bg} ${statusConfig[selected.status].color}`}
                >
                  {createElement(statusConfig[selected.status].icon, {
                    className: "h-3.5 w-3.5",
                  })}
                  {statusConfig[selected.status].label}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  監視チャネル
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    "J-PlatPat",
                    "PR TIMES",
                    "App Store",
                    "Google Play",
                  ].map((ch) => (
                    <div
                      key={ch}
                      className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    >
                      <Eye className="h-3.5 w-3.5 text-primary-500" />
                      {ch}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  クイック検索
                </h3>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://www.j-platpat.inpit.go.jp/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50"
                  >
                    <Search className="h-3.5 w-3.5" />
                    J-PlatPatで検索
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={`https://www.google.com/search?q="${selected.name}"`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Google検索
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={`https://prtimes.jp/searchkey/?keyword=${encodeURIComponent(selected.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50"
                  >
                    <Search className="h-3.5 w-3.5" />
                    PR TIMES
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  検出結果
                </h3>
                {selected.findings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                    <p className="mt-2 text-sm text-slate-500">
                      類似サービスは検出されていません
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      定期チェックを行い、新たな検出があればここに表示されます
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.findings.map((f, i) => {
                      const riskColors = {
                        low: "bg-blue-50 text-blue-700 border-blue-200",
                        medium:
                          "bg-amber-50 text-amber-700 border-amber-200",
                        high: "bg-red-50 text-red-700 border-red-200",
                      };
                      const riskLabels = {
                        low: "低",
                        medium: "中",
                        high: "高",
                      };
                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-400">
                                  {f.source}
                                </span>
                                <span className="text-xs text-slate-300">
                                  {f.date}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${riskColors[f.risk]}`}
                                >
                                  リスク: {riskLabels[f.risk]}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-medium text-slate-800">
                                {f.title}
                              </p>
                            </div>
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 rounded p-1 text-slate-400 hover:text-primary-500"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20">
              <div className="text-center">
                <Shield className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">
                  左のリストから商標を選択すると
                  <br />
                  詳細が表示されます
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
