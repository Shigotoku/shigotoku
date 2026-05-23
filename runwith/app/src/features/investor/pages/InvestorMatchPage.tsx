import { useState } from "react";
import {
  Search, MapPin, DollarSign, ExternalLink, Star,
  Filter, Briefcase, Building2, Heart, HeartOff,
} from "lucide-react";
import { useCompanyStore } from "../../../store/company";

interface Investor {
  id: string;
  name: string;
  type: "VC" | "CVC" | "エンジェル" | "事業会社";
  stage: string[];
  sectors: string[];
  ticketSize: string;
  location: string;
  portfolio: string[];
  description: string;
  baseMatch: number;
  url: string;
  medicalFocus?: boolean;
}

const investors: Investor[] = [
  {
    id: "inv-1", name: "ANRI", type: "VC",
    stage: ["シード", "アーリー"],
    sectors: ["ディープテック", "ヘルスケア", "SaaS", "AI"],
    ticketSize: "〜5億円", location: "東京",
    portfolio: ["READYFOR", "hey", "RevComm"],
    description: "シード期のディープテック・ヘルスケアスタートアップに強み。創業初期からの伴走型支援が特徴。",
    baseMatch: 90, url: "https://anri.vc/", medicalFocus: true,
  },
  {
    id: "inv-2", name: "Beyond Next Ventures", type: "VC",
    stage: ["シード", "アーリー"],
    sectors: ["ヘルスケア", "バイオ", "メドテック", "ディープテック"],
    ticketSize: "〜3億円", location: "東京",
    portfolio: ["マイクロ波化学", "Grace Imaging", "Bioatla"],
    description: "大学発・研究開発型ベンチャーに特化。医療・ヘルスケア領域の投資実績が国内最多水準。",
    baseMatch: 95, url: "https://beyondnextventures.com/", medicalFocus: true,
  },
  {
    id: "inv-3", name: "Coral Capital", type: "VC",
    stage: ["シード", "シリーズA"],
    sectors: ["SaaS", "フィンテック", "ヘルスケア", "HR Tech"],
    ticketSize: "〜10億円", location: "東京",
    portfolio: ["SmartHR", "ANDPAD", "助太刀", "Ubie"],
    description: "日本最大級のシードVC。SaaS・ヘルスケア領域の実績豊富。英語でのDD対応も可能。",
    baseMatch: 85, url: "https://coralcap.co/", medicalFocus: false,
  },
  {
    id: "inv-4", name: "Incubate Fund", type: "VC",
    stage: ["プレシード", "シード"],
    sectors: ["IT全般", "ヘルスケア", "教育", "フィンテック"],
    ticketSize: "〜2億円", location: "東京",
    portfolio: ["ラクスル", "WOVN.io", "Kyash"],
    description: "日本初のシード特化型VC。創業前からの支援が特徴で、ハンズオンサポートが強み。",
    baseMatch: 80, url: "https://incubatefund.com/", medicalFocus: false,
  },
  {
    id: "inv-5", name: "CyberAgent Capital", type: "CVC",
    stage: ["シード", "シリーズA", "シリーズB"],
    sectors: ["IT", "メディア", "ヘルスケアDX", "EC"],
    ticketSize: "〜15億円", location: "東京",
    portfolio: ["Chatwork", "BuySell Technologies", "SHIROBAKO"],
    description: "サイバーエージェントグループのCVC。事業シナジー活用と幅広いネットワークが強み。",
    baseMatch: 72, url: "https://www.cyberagentcapital.com/", medicalFocus: false,
  },
  {
    id: "inv-6", name: "MPower Partners", type: "VC",
    stage: ["シリーズA", "シリーズB", "グロース"],
    sectors: ["テクノロジー全般", "ESG", "ヘルスケア", "サステナビリティ"],
    ticketSize: "10〜50億円", location: "東京",
    portfolio: ["Acompany", "ABEJA"],
    description: "ESG・SDGsを重視した成長期向けVC。女性起業家支援にも積極的。",
    baseMatch: 68, url: "https://mpowerpartners.com/", medicalFocus: false,
  },
  {
    id: "inv-7", name: "グロービス・キャピタル・パートナーズ", type: "VC",
    stage: ["シード", "シリーズA", "シリーズB"],
    sectors: ["B2B SaaS", "フィンテック", "EdTech", "HRTech"],
    ticketSize: "〜30億円", location: "東京",
    portfolio: ["freee", "スマートニュース", "Mobility Technologies"],
    description: "国内有数の老舗VCで投資実績・上場実績が豊富。ハンズオン支援と経営人材提供に強み。",
    baseMatch: 77, url: "https://globalvent.com/", medicalFocus: false,
  },
  {
    id: "inv-8", name: "East Ventures", type: "VC",
    stage: ["プレシード", "シード", "シリーズA"],
    sectors: ["IT", "EC", "フィンテック", "SaaS"],
    ticketSize: "〜3億円", location: "東京",
    portfolio: ["メルカリ", "Tokopedia", "Shopback"],
    description: "東南アジア展開にも強いシード特化VC。スピード投資と多数ポートフォリオが特徴。",
    baseMatch: 70, url: "https://east.vc/", medicalFocus: false,
  },
  {
    id: "inv-9", name: "三菱UFJキャピタル", type: "CVC",
    stage: ["シリーズA", "シリーズB", "レイター"],
    sectors: ["フィンテック", "ヘルスケア", "製造DX", "AI"],
    ticketSize: "〜20億円", location: "東京",
    portfolio: ["数十社（非公開多数）"],
    description: "三菱UFJグループのCVC。上場支援・金融機関ネットワーク活用・海外展開サポートが強み。",
    baseMatch: 65, url: "https://muvc.co.jp/", medicalFocus: true,
  },
  {
    id: "inv-10", name: "WiL (World Innovation Lab)", type: "VC",
    stage: ["シリーズA", "シリーズB"],
    sectors: ["ディープテック", "ヘルスケア", "AI", "SaaS"],
    ticketSize: "〜30億円", location: "東京・シリコンバレー",
    portfolio: ["Mujin", "Terra Drone", "Spiber"],
    description: "日本とシリコンバレーを結ぶVC。グローバル展開・米国市場参入支援に特化。",
    baseMatch: 74, url: "https://wilab.com/", medicalFocus: false,
  },
  {
    id: "inv-11", name: "Takase Investment", type: "エンジェル",
    stage: ["プレシード", "シード"],
    sectors: ["ヘルスケア", "メドテック", "バイオ"],
    ticketSize: "〜5,000万円", location: "東京・大阪",
    portfolio: ["医療系スタートアップ複数"],
    description: "医療・ヘルスケア分野専門のエンジェル投資家ネットワーク。医療機関とのコネクションが強み。",
    baseMatch: 88, url: "#", medicalFocus: true,
  },
  {
    id: "inv-12", name: "MEDISO（医療系特化型）", type: "事業会社",
    stage: ["シード", "シリーズA"],
    sectors: ["メドテック", "ヘルスケア", "医療AI", "バイオテック"],
    ticketSize: "〜5億円", location: "東京・大阪",
    portfolio: ["医療DXスタートアップ"],
    description: "医療機関・製薬会社との橋渡しに強い事業会社系VC。規制対応・臨床試験サポートも提供。",
    baseMatch: 93, url: "#", medicalFocus: true,
  },
];

const stageFilters = ["すべて", "プレシード", "シード", "シリーズA", "シリーズB", "グロース"];
const typeFilters = ["すべてのタイプ", "VC", "CVC", "エンジェル", "事業会社"];

export default function InvestorMatchPage() {
  const { company } = useCompanyStore();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("すべて");
  const [typeFilter, setTypeFilter] = useState("すべてのタイプ");
  const [medicalOnly, setMedicalOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem("vc-favorites");
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch { return new Set(); }
  });
  const [showFavOnly, setShowFavOnly] = useState(false);

  const toggleFavorite = (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFavorites(next);
    localStorage.setItem("vc-favorites", JSON.stringify([...next]));
  };

  const getMatchScore = (inv: Investor): number => {
    let score = inv.baseMatch;
    if (company?.industry && inv.sectors.some(s => s.toLowerCase().includes("ヘルスケア") || s.includes("医療"))) {
      if (company.industry === "医療・ヘルスケア") score = Math.min(99, score + 5);
    }
    return score;
  };

  const filtered = investors
    .filter(inv => {
      if (search && !inv.name.includes(search) && !inv.description.includes(search) && !inv.sectors.some(s => s.includes(search))) return false;
      if (stageFilter !== "すべて" && !inv.stage.some(s => s.includes(stageFilter))) return false;
      if (typeFilter !== "すべてのタイプ" && inv.type !== typeFilter) return false;
      if (medicalOnly && !inv.medicalFocus) return false;
      if (showFavOnly && !favorites.has(inv.id)) return false;
      return true;
    })
    .map(inv => ({ ...inv, match: getMatchScore(inv) }))
    .sort((a, b) => {
      if (favorites.has(a.id) && !favorites.has(b.id)) return -1;
      if (!favorites.has(a.id) && favorites.has(b.id)) return 1;
      return b.match - a.match;
    });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">投資家マッチング</h1>
        <p className="mt-1 text-slate-500">
          {company?.name ? `${company.name}の` : "あなたの"}事業ステージ・業界に合った投資家候補を探しましょう
        </p>
      </div>

      {/* フィルター */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="VC名・業種・キーワードで検索..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-slate-400" />
          {stageFilters.map(s => (
            <button key={s} onClick={() => setStageFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${stageFilter === s ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {typeFilters.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${typeFilter === t ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {t}
            </button>
          ))}
          <button
            onClick={() => setMedicalOnly(!medicalOnly)}
            className={`ml-auto rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${medicalOnly ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            医療特化のみ
          </button>
          <button
            onClick={() => setShowFavOnly(!showFavOnly)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${showFavOnly ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            ★ お気に入りのみ
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">{filtered.length}件の投資家が見つかりました</p>

      {/* 投資家リスト */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-200" />
            <p>条件に合う投資家が見つかりませんでした</p>
          </div>
        ) : filtered.map(inv => (
          <div key={inv.id} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{inv.name}</h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{inv.type}</span>
                  {inv.medicalFocus && (
                    <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">医療特化</span>
                  )}
                  {favorites.has(inv.id) && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">★ お気に入り</span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{inv.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{inv.ticketSize}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{inv.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{inv.stage.join("・")}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {inv.sectors.map(s => (
                    <span key={s} className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-600">{s}</span>
                  ))}
                </div>
                {inv.portfolio.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] text-slate-400 mb-1.5">投資先例</p>
                    <div className="flex flex-wrap gap-1.5">
                      {inv.portfolio.map(p => (
                        <span key={p} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
                <div>
                  <div className="mb-1 flex items-center justify-end gap-1">
                    <Star className="h-4 w-4 text-amber-400" />
                    <span className="text-lg font-bold text-slate-900">{inv.match}%</span>
                  </div>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                      style={{ width: `${inv.match}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 text-right">マッチ度</p>
                </div>
                <button
                  onClick={() => toggleFavorite(inv.id)}
                  className={`rounded-lg p-2 transition-colors ${favorites.has(inv.id) ? "text-amber-500 hover:text-amber-600" : "text-slate-300 hover:text-slate-500"}`}
                  title={favorites.has(inv.id) ? "お気に入りから削除" : "お気に入りに追加"}
                >
                  <Heart className={`h-5 w-5 ${favorites.has(inv.id) ? "fill-current" : ""}`} />
                </button>
                {inv.url !== "#" && (
                  <a
                    href={inv.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-100"
                  >
                    詳細 <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
