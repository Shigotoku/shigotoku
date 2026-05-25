import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search, Banknote, Filter, Clock, ArrowRight, Star,
  CheckCircle2, BookmarkPlus, Bookmark, AlertTriangle,
  CalendarDays, FileText, BookOpen, Bot, Copy,
  ExternalLink, Bell, BellOff, ChevronDown, ChevronUp,
  Sparkles, Info, TrendingUp, AlertCircle, Target,
  Building2, MapPin, Users, Briefcase, Zap,
} from "lucide-react";
import { useCompanyStore, type Company } from "../../../store/company";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";

/* ================================================================
   データ型
   ================================================================ */

interface Subsidy {
  id: string;
  name: string;
  organization: string;
  maxAmount: string;
  maxAmountNum: number;
  rate: string;
  deadline: string;
  nextOpen?: string;
  category: string;
  description: string;
  tags: string[];
  medicalOnly?: boolean;
  eligibility: {
    maxEmployees?: number;
    minCapital?: number;
    maxCapital?: number;
    requiredPhases?: string[];
    regions?: string[];
    industries?: string[];
    foundedWithinYears?: number;
  };
  requiredDocs: string[];
  officialUrl: string;
  difficulty: "easy" | "medium" | "hard";
  approvalRate?: string;
  processingTime?: string;
}

type ApplicationStatus = "none" | "interested" | "preparing" | "applied" | "approved" | "rejected" | "completed";
type TabId = "search" | "calendar" | "tracker" | "docs" | "knowledge";

interface AppStatusEntry {
  status: ApplicationStatus;
  note: string;
  alertEnabled: boolean;
  startedAt?: string;
  appliedAt?: string;
}

/* ================================================================
   定数
   ================================================================ */

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  none: "未着手",
  interested: "検討中",
  preparing: "準備中",
  applied: "申請済",
  approved: "採択",
  rejected: "不採択",
  completed: "完了",
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  none: "bg-slate-100 text-slate-500",
  interested: "bg-sky-100 text-sky-700",
  preparing: "bg-amber-100 text-amber-700",
  applied: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
  completed: "bg-violet-100 text-violet-700",
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: "比較的簡単", color: "bg-emerald-50 text-emerald-700" },
  medium: { label: "標準", color: "bg-amber-50 text-amber-700" },
  hard: { label: "難易度高", color: "bg-red-50 text-red-700" },
};

const TAB_ITEMS: { id: TabId; label: string; icon: typeof Search }[] = [
  { id: "search", label: "マッチング検索", icon: Sparkles },
  { id: "calendar", label: "締切カレンダー", icon: CalendarDays },
  { id: "tracker", label: "申請管理", icon: Target },
  { id: "docs", label: "書類準備", icon: FileText },
  { id: "knowledge", label: "ガイド・ナレッジ", icon: BookOpen },
];

/* ================================================================
   補助金データベース（2026年度最新）
   ================================================================ */

const subsidies: Subsidy[] = [
  {
    id: "sub-1",
    name: "小規模事業者持続化補助金",
    organization: "日本商工会議所",
    maxAmount: "最大250万円",
    maxAmountNum: 250,
    rate: "2/3",
    deadline: "2026-05-31",
    nextOpen: "2026-03-01",
    category: "販路開拓",
    description: "小規模事業者が行う販路開拓や業務効率化の取り組みを支援。創業枠もあり、創業3年以内のスタートアップに有利。HP制作やマーケティング費用にも活用可能。",
    tags: ["創業枠あり", "IT導入も対象", "Web制作OK"],
    eligibility: { maxEmployees: 20, foundedWithinYears: 100 },
    requiredDocs: ["経営計画書", "補助事業計画書", "事業支援計画書（様式4）", "賃金引上げ計画の誓約書"],
    officialUrl: "https://r3.jizokukahojokin.info/",
    difficulty: "easy",
    approvalRate: "約50〜60%",
    processingTime: "約2〜3ヶ月",
  },
  {
    id: "sub-2",
    name: "ものづくり・商業・サービス補助金",
    organization: "全国中小企業団体中央会",
    maxAmount: "最大4,000万円",
    maxAmountNum: 4000,
    rate: "1/2〜2/3",
    deadline: "2026-06-20",
    category: "新製品・サービス開発",
    description: "中小企業が行う革新的な製品・サービスの開発や生産プロセスの改善を支援。デジタル枠・グリーン枠あり。プロダクト開発の設備投資やシステム構築に活用可能。",
    tags: ["デジタル枠", "グリーン枠", "グローバル枠"],
    eligibility: { maxEmployees: 300 },
    requiredDocs: ["事業計画書（10ページ以内）", "賃金引上げ計画の表明書", "決算書（直近2年分）", "労働者名簿"],
    officialUrl: "https://portal.monodukuri-hojo.jp/",
    difficulty: "medium",
    approvalRate: "約40〜50%",
    processingTime: "約3〜4ヶ月",
  },
  {
    id: "sub-3",
    name: "IT導入補助金",
    organization: "サービスデザイン推進協議会",
    maxAmount: "最大450万円",
    maxAmountNum: 450,
    rate: "1/2〜3/4",
    deadline: "2026-06-30",
    category: "IT導入",
    description: "ITツール（ソフトウェア・クラウドサービス等）の導入を支援。会計ソフト、CRM、プロジェクト管理ツール等も対象。セキュリティ対策枠もあり。",
    tags: ["通常枠", "セキュリティ対策推進枠", "デジタル化基盤導入枠"],
    eligibility: { maxEmployees: 300 },
    requiredDocs: ["交付申請書", "ITツール情報", "事業計画", "賃金情報"],
    officialUrl: "https://it-shien.smrj.go.jp/",
    difficulty: "easy",
    approvalRate: "約60〜70%",
    processingTime: "約1〜2ヶ月",
  },
  {
    id: "sub-4",
    name: "新事業進出補助金",
    organization: "中小企業庁",
    maxAmount: "最大9,000万円",
    maxAmountNum: 9000,
    rate: "1/2〜2/3",
    deadline: "2026-07-15",
    category: "事業転換・新分野展開",
    description: "新分野展開や業態転換を支援する大型補助金。新しい事業領域への進出を計画している企業に最適。",
    tags: ["成長枠", "産業構造転換枠", "大型投資可能"],
    eligibility: { maxEmployees: 300 },
    requiredDocs: ["事業計画書（15ページ以内）", "認定経営革新等支援機関の確認書", "決算書（直近3年分）", "金融機関からの資金調達計画"],
    officialUrl: "https://jigyou-saikouchiku.go.jp/",
    difficulty: "hard",
    approvalRate: "約30〜40%",
    processingTime: "約3〜5ヶ月",
  },
  {
    id: "sub-5",
    name: "AMED 医療機器開発支援",
    organization: "日本医療研究開発機構（AMED）",
    maxAmount: "最大5,000万円",
    maxAmountNum: 5000,
    rate: "定額",
    deadline: "2026-05-10",
    category: "医療機器開発",
    description: "革新的な医療機器の開発を行うスタートアップを支援。プロトタイプ開発から薬事申請準備まで。SaMD（プログラム医療機器）開発にも対応。",
    tags: ["医療特化", "スタートアップ優遇", "SaMD対応"],
    medicalOnly: true,
    eligibility: { maxEmployees: 300, industries: ["医療機器", "デジタルヘルス", "医療AI"] },
    requiredDocs: ["研究開発計画書", "薬事戦略書", "知的財産戦略", "事業化計画書"],
    officialUrl: "https://www.amed.go.jp/",
    difficulty: "hard",
    approvalRate: "約20〜30%",
    processingTime: "約4〜6ヶ月",
  },
  {
    id: "sub-6",
    name: "東京都 創業助成金",
    organization: "東京都中小企業振興公社",
    maxAmount: "最大400万円",
    maxAmountNum: 400,
    rate: "2/3",
    deadline: "2026-04-30",
    category: "創業支援",
    description: "東京都内で創業を予定している方、または創業して5年未満の方を対象とした助成金。賃借料、広告費、人件費等が対象。",
    tags: ["東京都限定", "創業5年未満", "人件費も対象"],
    eligibility: { regions: ["東京都"], foundedWithinYears: 5 },
    requiredDocs: ["事業計画書", "創業計画書", "住民票（都内在住の確認）", "確定申告書"],
    officialUrl: "https://www.tokyo-kosha.or.jp/support/josei/sogyo/",
    difficulty: "medium",
    approvalRate: "約30〜40%",
    processingTime: "約3〜4ヶ月",
  },
  {
    id: "sub-7",
    name: "省力化投資補助金",
    organization: "中小企業庁",
    maxAmount: "最大1億円",
    maxAmountNum: 10000,
    rate: "1/2",
    deadline: "2026-08-31",
    category: "省力化・DX",
    description: "ロボットやIoT、AI等の導入による人手不足解消・業務効率化を支援。カタログ型とオーダーメイド型の2種類あり。",
    tags: ["ロボット導入", "IoT", "AI活用", "大型投資"],
    eligibility: { maxEmployees: 300 },
    requiredDocs: ["投資計画書", "見積書", "労働生産性向上計画", "賃金引上げ計画"],
    officialUrl: "https://shoryokuka.smrj.go.jp/",
    difficulty: "medium",
    approvalRate: "約40〜50%",
    processingTime: "約2〜3ヶ月",
  },
  {
    id: "sub-8",
    name: "中小企業成長加速化補助金",
    organization: "中小企業庁",
    maxAmount: "最大5億円",
    maxAmountNum: 50000,
    rate: "1/2〜2/3",
    deadline: "2026-09-30",
    category: "大規模投資",
    description: "売上100億円を目指す中小企業の大規模投資を支援。設備投資、研究開発、販路開拓等に幅広く活用可能。",
    tags: ["大規模投資", "成長志向", "設備投資"],
    eligibility: { maxEmployees: 300, minCapital: 100 },
    requiredDocs: ["成長戦略計画書", "投資計画書", "財務計画", "金融機関との連携計画"],
    officialUrl: "https://seichokasokuka.go.jp/",
    difficulty: "hard",
    approvalRate: "約20〜30%",
    processingTime: "約4〜6ヶ月",
  },
  {
    id: "sub-9",
    name: "事業承継・M&A補助金",
    organization: "中小企業庁",
    maxAmount: "最大2,000万円",
    maxAmountNum: 2000,
    rate: "1/2〜2/3",
    deadline: "2026-06-15",
    category: "事業承継",
    description: "M&A後の経営統合や事業承継に伴う経営革新を支援。M&A仲介手数料やPMI費用も対象。",
    tags: ["M&A支援", "事業承継", "PMI費用対象"],
    eligibility: { maxEmployees: 300 },
    requiredDocs: ["経営革新計画書", "M&A契約書の写し", "事業承継計画"],
    officialUrl: "https://jsh.go.jp/",
    difficulty: "medium",
    approvalRate: "約50〜60%",
    processingTime: "約2〜3ヶ月",
  },
  {
    id: "sub-10",
    name: "SBIR（中小企業技術革新制度）",
    organization: "内閣府・各省庁",
    maxAmount: "最大数億円",
    maxAmountNum: 100000,
    rate: "定額（フェーズにより異なる）",
    deadline: "2026-07-31",
    category: "技術開発",
    description: "政府ニーズに応える技術開発型スタートアップを支援。フェーズ1（FS）からフェーズ3（事業化）まで段階的に支援。",
    tags: ["技術開発", "政府ニーズ", "段階的支援"],
    eligibility: { maxEmployees: 300, industries: ["テクノロジー", "IT", "バイオ", "医療"] },
    requiredDocs: ["研究開発計画書", "技術説明資料", "事業化計画", "経歴書"],
    officialUrl: "https://www8.cao.go.jp/cstp/stmain/20220325sbir.html",
    difficulty: "hard",
    approvalRate: "約15〜25%",
    processingTime: "約3〜6ヶ月",
  },
  {
    id: "sub-11",
    name: "キャリアアップ助成金",
    organization: "厚生労働省",
    maxAmount: "1人あたり最大80万円",
    maxAmountNum: 80,
    rate: "定額",
    deadline: "通年",
    category: "雇用・人材",
    description: "非正規雇用労働者の正社員化や待遇改善を行う事業主に対する助成金。正社員化コースが最も人気。",
    tags: ["通年申請", "正社員化支援", "人材育成"],
    eligibility: { maxEmployees: 9999 },
    requiredDocs: ["キャリアアップ計画書", "転換届", "労働条件通知書", "賃金台帳"],
    officialUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/part_haken/jigyounushi/career.html",
    difficulty: "easy",
    approvalRate: "約70〜80%",
    processingTime: "約2〜4ヶ月",
  },
  {
    id: "sub-12",
    name: "人材開発支援助成金",
    organization: "厚生労働省",
    maxAmount: "最大1,000万円/年",
    maxAmountNum: 1000,
    rate: "45〜75%",
    deadline: "通年",
    category: "雇用・人材",
    description: "従業員の職業訓練やスキルアップ研修を実施する企業を支援。DX研修やリスキリング支援のコースもあり。",
    tags: ["通年申請", "研修費用", "DX人材育成"],
    eligibility: { maxEmployees: 9999 },
    requiredDocs: ["訓練実施計画書", "訓練カリキュラム", "受講者名簿", "経費明細"],
    officialUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/d01-1.html",
    difficulty: "easy",
    approvalRate: "約80%以上",
    processingTime: "約1〜2ヶ月",
  },
];

const categories = [
  "すべて", "販路開拓", "新製品・サービス開発", "IT導入",
  "創業支援", "医療機器開発", "事業転換・新分野展開",
  "省力化・DX", "大規模投資", "技術開発", "雇用・人材", "事業承継",
];

const STORAGE_KEY_STATUS = "funding-app-status-v2";
const STORAGE_KEY_FAVORITES = "funding-favorites";
const STORAGE_KEY_ALERTS = "funding-alerts";

/* ================================================================
   ユーティリティ
   ================================================================ */

function daysUntil(dateStr: string): number {
  if (dateStr === "通年") return 999;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function calcMatchScore(s: Subsidy, company: Company | null): number {
  if (!company) return 50;
  let score = 50;
  const e = s.eligibility;

  if (e.maxEmployees && company.employeeCount <= e.maxEmployees) score += 10;
  if (e.maxEmployees && company.employeeCount > e.maxEmployees) return 5;

  if (e.regions) {
    const matched = e.regions.some((r) => company.address.includes(r) || company.postalCode.startsWith(r === "東京都" ? "1" : ""));
    if (matched) score += 15;
    else score -= 20;
  } else {
    score += 5;
  }

  if (e.foundedWithinYears && company.foundedDate) {
    const years = (Date.now() - new Date(company.foundedDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (years <= e.foundedWithinYears) score += 10;
    else if (e.foundedWithinYears <= 5) score -= 15;
  }

  if (s.medicalOnly) {
    if (company.isMedicalMode) score += 15;
    else return 5;
  }

  if (e.industries && company.industry) {
    if (e.industries.some((ind) => company.industry.includes(ind) || company.description?.includes(ind))) {
      score += 10;
    }
  }

  const phase = company.phase;
  if (s.category === "創業支援" && ["idea", "pre_founding", "founded"].includes(phase)) score += 10;
  if (s.category === "大規模投資" && ["series_a", "series_b_plus"].includes(phase)) score += 10;
  if (s.category === "雇用・人材" && company.employeeCount >= 1) score += 5;

  if (e.minCapital && company.capitalAmount < e.minCapital * 10000) score -= 10;

  return Math.max(5, Math.min(99, score));
}

function getMonthName(m: number): string {
  return `${m}月`;
}

/* ================================================================
   メインコンポーネント
   ================================================================ */

export default function FundingSearchPage() {
  const { company } = useCompanyStore();
  const [tab, setTab] = useState<TabId>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [showMedicalOnly, setShowMedicalOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"match" | "deadline" | "amount">("match");
  const [appStatus, setAppStatus] = useCompanyStorageState<Record<string, AppStatusEntry>>(STORAGE_KEY_STATUS, {});
  const [favoritesArr, setFavoritesArr] = useCompanyStorageState<string[]>(STORAGE_KEY_FAVORITES, []);
  const [alertsArr, setAlertsArr] = useCompanyStorageState<string[]>(STORAGE_KEY_ALERTS, []);
  const favorites = useMemo(() => new Set(favoritesArr), [favoritesArr]);
  const alerts = useMemo(() => new Set(alertsArr), [alertsArr]);

  const saveStatus = (id: string, entry: Partial<AppStatusEntry>) => {
    setAppStatus((prev) => {
      const current = prev[id] || { status: "none", note: "", alertEnabled: false };
      return { ...prev, [id]: { ...current, ...entry } };
    });
  };

  const toggleFavorite = (id: string) => {
    setFavoritesArr((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return [...next];
    });
  };

  const toggleAlert = (id: string) => {
    setAlertsArr((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return [...next];
    });
  };

  const scoredSubsidies = useMemo(() =>
    subsidies.map((s) => ({ ...s, match: calcMatchScore(s, company) })),
    [company]
  );

  const filtered = useMemo(() =>
    scoredSubsidies
      .filter((s) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q) && !s.tags.some(t => t.toLowerCase().includes(q)))
            return false;
        }
        if (selectedCategory !== "すべて" && s.category !== selectedCategory) return false;
        if (showMedicalOnly && !s.medicalOnly) return false;
        if (showFavoritesOnly && !favorites.has(s.id)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "match") return b.match - a.match;
        if (sortBy === "amount") return b.maxAmountNum - a.maxAmountNum;
        const da = a.deadline === "通年" ? Infinity : new Date(a.deadline).getTime();
        const db = b.deadline === "通年" ? Infinity : new Date(b.deadline).getTime();
        return da - db;
      }),
    [scoredSubsidies, searchQuery, selectedCategory, showMedicalOnly, showFavoritesOnly, sortBy, favorites]
  );

  const trackedSubsidies = scoredSubsidies.filter(
    (s) => appStatus[s.id] && appStatus[s.id].status !== "none"
  );

  const alertSubsidies = scoredSubsidies.filter((s) => {
    const days = daysUntil(s.deadline);
    return alerts.has(s.id) && days > 0 && days <= 30;
  });

  const stats = {
    total: filtered.length,
    favorites: favorites.size,
    applied: Object.values(appStatus).filter((s) => s.status === "applied").length,
    approved: Object.values(appStatus).filter((s) => s.status === "approved").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">補助金・助成金マッチング</h1>
        <p className="mt-1 text-sm text-slate-500">
          あなたの会社に最適な補助金を検索し、申請から採択までをサポートします
        </p>
      </div>

      {/* アラート */}
      {alertSubsidies.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <Bell className="h-4 w-4" />
            締切が近い補助金があります（{alertSubsidies.length}件）
          </div>
          <div className="mt-2 space-y-1">
            {alertSubsidies.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs text-amber-700">
                <span>{s.name}</span>
                <span className="font-semibold">あと{daysUntil(s.deadline)}日（{s.deadline}）</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 通知登録セクション */}
      <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-5 w-5 text-primary-600" />
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900">補助金・助成金の通知を受け取る</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              関心のある補助金・助成金を登録すると、政府から発表された際（提出開始日・締切日）にプッシュ通知でお知らせします。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {subsidies.filter(s => appStatus[s.id]?.alertEnabled).length > 0 ? (
                <p className="text-xs font-medium text-primary-700">
                  現在 {subsidies.filter(s => appStatus[s.id]?.alertEnabled).length} 件の補助金の通知がONです。
                  各補助金のベルアイコンから個別にON/OFFできます。
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  補助金カードのベルアイコンをクリックして通知をONにしてください。新しい公募情報が発表され次第お知らせします。
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "対象件数", value: `${stats.total}件`, icon: Banknote, color: "text-primary-600 bg-primary-50" },
          { label: "お気に入り", value: `${stats.favorites}件`, icon: Bookmark, color: "text-amber-600 bg-amber-50" },
          { label: "申請済", value: `${stats.applied}件`, icon: CheckCircle2, color: "text-blue-600 bg-blue-50" },
          { label: "採択", value: `${stats.approved}件`, icon: Star, color: "text-emerald-600 bg-emerald-50" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{item.value}</p>
                  <p className="text-[11px] text-slate-500">{item.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {company && (
        <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">AIマッチング結果</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                <span className="text-primary-600">{company.name}</span> に適用可能な補助金が
                <span className="text-2xl text-primary-600"> {filtered.length}件</span> 見つかりました
              </p>
              <p className="mt-1 text-xs text-slate-500">
                業種・所在地・従業員数・資本金・設立年・フェーズから自動マッチング
              </p>
            </div>
            <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-primary-100 sm:flex">
              <Sparkles className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/60 bg-white p-1.5 shadow-sm">
        {TAB_ITEMS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* タブコンテンツ */}
      {tab === "search" && (
        <SearchTab
          filtered={filtered}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          showMedicalOnly={showMedicalOnly}
          setShowMedicalOnly={setShowMedicalOnly}
          showFavoritesOnly={showFavoritesOnly}
          setShowFavoritesOnly={setShowFavoritesOnly}
          sortBy={sortBy}
          setSortBy={setSortBy}
          appStatus={appStatus}
          saveStatus={saveStatus}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          alerts={alerts}
          toggleAlert={toggleAlert}
          company={company}
        />
      )}
      {tab === "calendar" && <CalendarTab subsidies={scoredSubsidies} alerts={alerts} toggleAlert={toggleAlert} />}
      {tab === "tracker" && (
        <TrackerTab
          tracked={trackedSubsidies}
          appStatus={appStatus}
          saveStatus={saveStatus}
        />
      )}
      {tab === "docs" && <DocsTab subsidies={scoredSubsidies} company={company} appStatus={appStatus} />}
      {tab === "knowledge" && <KnowledgeTab />}
    </div>
  );
}

/* ================================================================
   タブ1: マッチング検索
   ================================================================ */

function SearchTab({
  filtered, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
  showMedicalOnly, setShowMedicalOnly, showFavoritesOnly, setShowFavoritesOnly,
  sortBy, setSortBy, appStatus, saveStatus, favorites, toggleFavorite,
  alerts, toggleAlert, company,
}: {
  filtered: (Subsidy & { match: number })[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  showMedicalOnly: boolean;
  setShowMedicalOnly: (v: boolean) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (v: boolean) => void;
  sortBy: string;
  setSortBy: (s: "match" | "deadline" | "amount") => void;
  appStatus: Record<string, AppStatusEntry>;
  saveStatus: (id: string, entry: Partial<AppStatusEntry>) => void;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  alerts: Set<string>;
  toggleAlert: (id: string) => void;
  company: Company | null;
}) {
  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="補助金名やキーワードで検索...（例：IT導入、創業、DX）"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-slate-400" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-primary-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {company?.isMedicalMode && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showMedicalOnly} onChange={(e) => setShowMedicalOnly(e.target.checked)} className="h-4 w-4 rounded accent-emerald-600" />
                <span className="text-xs font-medium text-slate-600">医療系のみ</span>
              </label>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showFavoritesOnly} onChange={(e) => setShowFavoritesOnly(e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
              <span className="text-xs font-medium text-slate-600">お気に入りのみ</span>
            </label>
            <div className="ml-auto flex items-center gap-1">
              {(["match", "deadline", "amount"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    sortBy === s ? "bg-primary-100 text-primary-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s === "match" ? "マッチ度順" : s === "deadline" ? "締切順" : "金額順"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 補助金リスト */}
      <div className="space-y-3">
        {filtered.map((s) => {
          const days = daysUntil(s.deadline);
          const isUrgent = days > 0 && days <= 30;
          const isExpired = days <= 0 && s.deadline !== "通年";
          const status = appStatus[s.id]?.status || "none";
          const isFav = favorites.has(s.id);
          const hasAlert = alerts.has(s.id);
          const diff = DIFFICULTY_LABELS[s.difficulty];

          return (
            <div
              key={s.id}
              className={`rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
                isUrgent ? "border-amber-200" : "border-slate-200/60"
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{s.category}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${diff.color}`}>{diff.label}</span>
                      {s.medicalOnly && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">医療特化</span>}
                      {isUrgent && (
                        <span className="flex items-center gap-0.5 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> 締切まで{days}日
                        </span>
                      )}
                      {isExpired && <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">締切済</span>}
                      {s.tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-600">{tag}</span>
                      ))}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                    <p className="text-xs text-slate-500">{s.organization}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{s.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleAlert(s.id)}
                        className={`p-1 transition-colors ${hasAlert ? "text-amber-500 hover:text-amber-600" : "text-slate-300 hover:text-amber-400"}`}
                        title={hasAlert ? "アラートOFF" : "締切アラートON"}
                      >
                        {hasAlert ? <Bell className="h-4 w-4 fill-current" /> : <BellOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => toggleFavorite(s.id)}
                        className={`p-1 transition-colors ${isFav ? "text-amber-500 hover:text-amber-600" : "text-slate-300 hover:text-amber-400"}`}
                        title={isFav ? "お気に入りから削除" : "お気に入りに追加"}
                      >
                        {isFav ? <Bookmark className="h-4 w-4 fill-current" /> : <BookmarkPlus className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-primary-500" />
                        <span className="text-sm font-bold text-slate-900">{s.match}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                          style={{ width: `${s.match}%` }}
                        />
                      </div>
                      {s.approvalRate && <p className="mt-1 text-[10px] text-slate-400">採択率{s.approvalRate}</p>}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-800">{s.maxAmount}</span>
                    <span className="text-xs text-slate-500">（補助率 {s.rate}）</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${isUrgent ? "text-amber-600 font-semibold" : "text-slate-600"}`}>
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">〆切 {s.deadline}</span>
                    {s.deadline !== "通年" && !isExpired && days > 0 && (
                      <span className="text-xs text-slate-400">（あと{days}日）</span>
                    )}
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <select
                      value={status}
                      onChange={(e) => saveStatus(s.id, { status: e.target.value as ApplicationStatus })}
                      className={`cursor-pointer rounded-lg border-0 px-2.5 py-1 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-primary-200 ${STATUS_COLORS[status]}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <Link
                      to={`/funding/${s.id}`}
                      className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      詳細 <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
          <Search className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">条件に一致する補助金が見つかりませんでした</p>
          <p className="mt-1 text-xs text-slate-400">検索条件を変更してお試しください</p>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   タブ2: 締切カレンダー
   ================================================================ */

function CalendarTab({
  subsidies,
  alerts,
  toggleAlert,
}: {
  subsidies: (Subsidy & { match: number })[];
  alerts: Set<string>;
  toggleAlert: (id: string) => void;
}) {
  const monthsAhead = 6;
  const now = new Date();
  const months: { year: number; month: number; subsidies: (Subsidy & { match: number; days: number })[] }[] = [];

  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const subs = subsidies
      .filter((s) => {
        if (s.deadline === "通年") return false;
        const dl = new Date(s.deadline);
        return dl.getFullYear() === y && dl.getMonth() + 1 === m;
      })
      .map((s) => ({ ...s, days: daysUntil(s.deadline) }))
      .sort((a, b) => a.days - b.days);
    months.push({ year: y, month: m, subsidies: subs });
  }

  const yearRoundSubs = subsidies.filter((s) => s.deadline === "通年");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">締切カレンダー</h2>
        <p className="text-xs text-slate-500">今後6ヶ月の補助金締切を一覧表示。アラートを設定すると締切30日前に通知されます。</p>
      </div>

      {months.map(({ year, month, subsidies: subs }) => (
        <div key={`${year}-${month}`} className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <CalendarDays className="h-4 w-4 text-primary-500" />
            <h3 className="text-sm font-bold text-slate-900">{year}年{month}月</h3>
            <span className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-600">
              {subs.length}件
            </span>
          </div>
          {subs.length === 0 ? (
            <p className="px-5 py-4 text-xs text-slate-400">この月に締切の補助金はありません</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    s.days <= 7 ? "bg-red-100 text-red-700" : s.days <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {s.deadline.split("-")[2]}日
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                    <p className="text-[11px] text-slate-500">{s.organization} · マッチ度{s.match}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${s.days <= 7 ? "text-red-600" : s.days <= 30 ? "text-amber-600" : "text-slate-500"}`}>
                      あと{s.days}日
                    </span>
                    <button
                      onClick={() => toggleAlert(s.id)}
                      className={`rounded-lg p-1.5 transition-colors ${alerts.has(s.id) ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500"}`}
                      title="アラート設定"
                    >
                      {alerts.has(s.id) ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    </button>
                    <Link to={`/funding/${s.id}`} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                      詳細 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {yearRoundSubs.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <Zap className="h-4 w-4" />
            通年申請可能な補助金・助成金
          </h3>
          <div className="mt-3 space-y-2">
            {yearRoundSubs.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-white p-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                  <p className="text-[11px] text-slate-500">{s.organization} · {s.maxAmount}</p>
                </div>
                <Link to={`/funding/${s.id}`} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                  詳細 →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   タブ3: 申請管理トラッカー
   ================================================================ */

function TrackerTab({
  tracked,
  appStatus,
  saveStatus,
}: {
  tracked: (Subsidy & { match: number })[];
  appStatus: Record<string, AppStatusEntry>;
  saveStatus: (id: string, entry: Partial<AppStatusEntry>) => void;
}) {
  const stages: ApplicationStatus[] = ["interested", "preparing", "applied", "approved", "completed"];

  if (tracked.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
        <Target className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">申請管理中の補助金はありません</p>
        <p className="mt-1 text-xs text-slate-400">マッチング検索タブで補助金のステータスを変更すると、ここに表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">申請管理トラッカー</h2>
        <p className="text-xs text-slate-500">申請中の補助金のステータスとメモを管理します</p>
      </div>

      {/* パイプラインビュー */}
      <div className="grid grid-cols-5 gap-2">
        {stages.map((stage) => {
          const items = tracked.filter((s) => appStatus[s.id]?.status === stage);
          return (
            <div key={stage} className="rounded-2xl border border-slate-200/60 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[stage]}`}>
                  {STATUS_LABELS[stage]}
                </span>
                <span className="text-[11px] text-slate-400">{items.length}件</span>
              </div>
              <div className="space-y-2">
                {items.map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-100 p-2.5">
                    <p className="text-[11px] font-bold text-slate-800 leading-tight">{s.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{s.maxAmount}</p>
                  </div>
                ))}
                {items.length === 0 && <p className="text-center text-[10px] text-slate-300">なし</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 詳細リスト */}
      <div className="space-y-3">
        {tracked.map((s) => {
          const entry = appStatus[s.id];
          const days = daysUntil(s.deadline);
          return (
            <div key={s.id} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{s.name}</h3>
                  <p className="text-xs text-slate-500">{s.organization} · 〆切 {s.deadline} {days > 0 && s.deadline !== "通年" ? `（あと${days}日）` : ""}</p>
                </div>
                <select
                  value={entry.status}
                  onChange={(e) => saveStatus(s.id, { status: e.target.value as ApplicationStatus })}
                  className={`cursor-pointer rounded-lg border-0 px-2.5 py-1 text-[11px] font-medium ${STATUS_COLORS[entry.status]}`}
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">メモ</label>
                <textarea
                  value={entry.note || ""}
                  onChange={(e) => saveStatus(s.id, { note: e.target.value })}
                  rows={2}
                  placeholder="進捗メモ、次のアクション等..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Link to={`/funding/${s.id}`} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                  詳細を見る →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   タブ4: 書類準備（AI支援）
   ================================================================ */

function DocsTab({
  subsidies,
  company,
  appStatus,
}: {
  subsidies: (Subsidy & { match: number })[];
  company: Company | null;
  appStatus: Record<string, AppStatusEntry>;
}) {
  const preparing = subsidies.filter(
    (s) => appStatus[s.id] && ["interested", "preparing"].includes(appStatus[s.id].status)
  );
  const [selectedId, setSelectedId] = useState<string>(preparing[0]?.id || subsidies[0]?.id || "");
  const [promptCopied, setPromptCopied] = useState(false);
  const selected = subsidies.find((s) => s.id === selectedId);

  const generatePrompt = () => {
    if (!selected) return "";
    const lines: string[] = [
      `# ${selected.name} 申請書類の作成支援`,
      "",
      "以下の情報をもとに、申請に必要な書類のドラフトを作成してください。",
      "",
      `## 補助金情報`,
      `- 名称: ${selected.name}`,
      `- 実施機関: ${selected.organization}`,
      `- 補助上限: ${selected.maxAmount}（補助率: ${selected.rate}）`,
      `- カテゴリ: ${selected.category}`,
      `- 締切: ${selected.deadline}`,
      "",
    ];

    if (company) {
      lines.push("## 会社情報");
      lines.push(`- 会社名: ${company.name}`);
      if (company.industry) lines.push(`- 業種: ${company.industry}`);
      if (company.address) lines.push(`- 所在地: ${company.address}`);
      if (company.employeeCount) lines.push(`- 従業員数: ${company.employeeCount}名`);
      if (company.capitalAmount) lines.push(`- 資本金: ${company.capitalAmount.toLocaleString()}円`);
      if (company.description) lines.push(`- 事業内容: ${company.description}`);
      lines.push("");
    }

    lines.push("## 必要書類");
    selected.requiredDocs.forEach((doc, i) => {
      lines.push(`${i + 1}. ${doc}`);
    });
    lines.push("");
    lines.push("## お願い事項");
    lines.push("1. 各書類のドラフトを作成してください");
    lines.push("2. 採択率を上げるためのポイントを各書類に含めてください");
    lines.push("3. 具体的な数値目標（KPI）の設定を提案してください");
    lines.push("4. 審査員が重視するポイントを踏まえた記述にしてください");
    lines.push("5. 記入例も示してください");

    return lines.join("\n");
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt());
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">書類準備・AI作成支援</h2>
        <p className="text-xs text-slate-500">
          補助金の申請書類をAIの力を借りて効率的に作成しましょう。
          会社情報が自動で反映されます。
        </p>
      </div>

      {/* 補助金選択 */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <label className="block text-xs font-medium text-slate-700 mb-2">書類を作成する補助金を選択</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          {preparing.length > 0 && (
            <optgroup label="準備中の補助金">
              {preparing.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </optgroup>
          )}
          <optgroup label="すべての補助金">
            {subsidies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}（マッチ度{s.match}%）</option>
            ))}
          </optgroup>
        </select>
      </div>

      {selected && (
        <>
          {/* 必要書類チェックリスト */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FileText className="h-4 w-4 text-primary-500" />
              {selected.name} の必要書類
            </h3>
            <div className="mt-3 space-y-2">
              {selected.requiredDocs.map((doc, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">{i + 1}</span>
                  <span className="text-sm text-slate-700">{doc}</span>
                </div>
              ))}
            </div>
            {selected.officialUrl && (
              <a
                href={selected.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                <ExternalLink className="h-3 w-3" />
                公式サイトで様式をダウンロード
              </a>
            )}
          </div>

          {/* AI書類作成 */}
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                <Bot className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-violet-900">AIで申請書類を作成する</h3>
                <p className="text-xs text-violet-600">会社情報と補助金情報をもとに、AIに書類作成を依頼するプロンプトを生成します</p>
              </div>
            </div>
            <pre className="mt-4 max-h-64 overflow-y-auto rounded-xl bg-white/80 p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
              {generatePrompt()}
            </pre>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={copyPrompt}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                <Copy className="h-3.5 w-3.5" />
                {promptCopied ? "コピーしました！" : "プロンプトをコピー"}
              </button>
              <a href="https://chat.openai.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <ExternalLink className="h-3 w-3" /> ChatGPTを開く
              </a>
              <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <ExternalLink className="h-3 w-3" /> Claudeを開く
              </a>
              <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <ExternalLink className="h-3 w-3" /> Geminiを開く
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================
   タブ5: ガイド・ナレッジベース
   ================================================================ */

function KnowledgeTab() {
  const [openSection, setOpenSection] = useState<string | null>("basics");

  const sections = [
    {
      id: "basics",
      title: "補助金・助成金の基礎知識",
      icon: BookOpen,
      content: (
        <div className="space-y-3">
          <KnowledgeBlock title="補助金と助成金の違い">
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex gap-2"><span className="shrink-0 font-bold text-primary-600">補助金</span> 審査あり。採択されないと受給できない。経産省系が多い。事業計画の質が重要。</li>
              <li className="flex gap-2"><span className="shrink-0 font-bold text-emerald-600">助成金</span> 要件を満たせば基本的に受給可能。厚労省系が多い。雇用関連が中心。</li>
            </ul>
          </KnowledgeBlock>
          <KnowledgeBlock title="後払い方式について">
            <p className="text-xs text-slate-600">
              補助金は原則<strong>後払い（精算払い）</strong>です。先に自己資金で支出し、事業完了後に補助金が振り込まれます。
              そのため、補助金額と同額以上の自己資金（つなぎ資金）を確保する必要があります。
              金融機関からのつなぎ融資を活用するケースも多いです。
            </p>
          </KnowledgeBlock>
          <KnowledgeBlock title="補助率と補助上限">
            <p className="text-xs text-slate-600">
              補助率2/3、上限250万円の場合：375万円の事業費に対して250万円が補助されます。
              自己負担は125万円＋補助対象外経費です。
              上限額を超える事業費の場合、超過分は全額自己負担となります。
            </p>
          </KnowledgeBlock>
        </div>
      ),
    },
    {
      id: "tips",
      title: "採択率を上げるコツ",
      icon: TrendingUp,
      content: (
        <div className="space-y-3">
          <KnowledgeBlock title="審査員が重視するポイント">
            <ol className="space-y-2 text-xs text-slate-600">
              <li><strong>1. 事業の革新性</strong>：既存事業との差別化、新規性が明確か</li>
              <li><strong>2. 実現可能性</strong>：計画に無理がないか、実行体制は整っているか</li>
              <li><strong>3. 事業効果</strong>：具体的な数値目標（売上増加率、生産性向上率等）</li>
              <li><strong>4. 地域経済への波及効果</strong>：雇用創出、地域活性化への貢献</li>
              <li><strong>5. 賃上げへの意欲</strong>：2026年度は特に重視される傾向</li>
            </ol>
          </KnowledgeBlock>
          <KnowledgeBlock title="事業計画書のチェックリスト">
            <ul className="space-y-1 text-xs text-slate-600">
              <li>✓ 課題と解決策が明確に記述されているか</li>
              <li>✓ 具体的なKPIと達成までのロードマップがあるか</li>
              <li>✓ 市場分析・競合分析が十分か</li>
              <li>✓ 収支計画に根拠があるか</li>
              <li>✓ 補助事業終了後の事業継続性が示されているか</li>
              <li>✓ 自社の強みが明確に記述されているか</li>
              <li>✓ 写真や図表を活用して読みやすくなっているか</li>
            </ul>
          </KnowledgeBlock>
          <KnowledgeBlock title="よくある不採択理由">
            <ul className="space-y-1 text-xs text-red-600">
              <li>✗ 事業内容が抽象的で具体性がない</li>
              <li>✗ 数値目標の根拠が不明確</li>
              <li>✗ 既存事業の延長線上で革新性がない</li>
              <li>✗ 補助事業と通常事業の区分が不明確</li>
              <li>✗ 申請書に誤字脱字・記載漏れがある</li>
            </ul>
          </KnowledgeBlock>
        </div>
      ),
    },
    {
      id: "process",
      title: "申請から受給までの流れ",
      icon: Target,
      content: (
        <div className="space-y-3">
          {[
            { step: "1", title: "情報収集・マッチング", desc: "自社に合った補助金を探す。公募要領を熟読する。", time: "随時" },
            { step: "2", title: "GBizIDプライムの取得", desc: "電子申請に必須。取得に1〜2週間かかるため早めに。", time: "1〜2週間" },
            { step: "3", title: "事業計画の策定", desc: "具体的な事業計画書を作成。認定支援機関への相談も。", time: "2〜4週間" },
            { step: "4", title: "申請書類の作成・提出", desc: "jGrantsで電子申請。添付書類を漏れなく準備。", time: "1〜2週間" },
            { step: "5", title: "審査・採択発表", desc: "書面審査（一部は面接審査あり）。結果は2〜4ヶ月後。", time: "2〜4ヶ月" },
            { step: "6", title: "交付申請・交付決定", desc: "採択後、正式な交付申請を行い、交付決定を受ける。", time: "2〜4週間" },
            { step: "7", title: "補助事業の実施", desc: "交付決定後に事業を開始（遡及不可！）。経費は証憑を保管。", time: "事業計画による" },
            { step: "8", title: "実績報告・確定検査", desc: "事業完了後、実績報告書を提出。証拠書類の確認。", time: "1〜2ヶ月" },
            { step: "9", title: "補助金の請求・受領", desc: "確定額に基づいて請求し、口座に振り込まれる。", time: "1〜2ヶ月" },
          ].map((item) => (
            <div key={item.step} className="flex gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                {item.step}
              </span>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
              <span className="shrink-0 text-[10px] text-slate-400">{item.time}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "rules",
      title: "補助金の重要ルール",
      icon: AlertCircle,
      content: (
        <div className="space-y-3">
          <KnowledgeBlock title="絶対に知っておくべきルール" variant="warning">
            <ul className="space-y-2 text-xs text-red-700">
              <li><strong>交付決定前の支出は対象外</strong>：採択されても交付決定通知を受け取る前に使った経費は補助されません</li>
              <li><strong>証拠書類は5年以上保管</strong>：領収書、契約書、納品書、検収書等を保管義務あり</li>
              <li><strong>目的外使用は返還義務</strong>：補助金を申請とは異なる目的で使用した場合、全額返還+加算金</li>
              <li><strong>財産処分の制限</strong>：補助金で取得した財産は一定期間処分（売却・廃棄）に制限あり</li>
              <li><strong>重複申請の禁止</strong>：同一内容で複数の補助金を受けることは原則不可</li>
            </ul>
          </KnowledgeBlock>
          <KnowledgeBlock title="経費の基本ルール">
            <ul className="space-y-1 text-xs text-slate-600">
              <li>・見積もりは原則<strong>2社以上</strong>から取得（50万円以上の場合は3社以上を推奨）</li>
              <li>・現金払いは避け、<strong>振込</strong>で支払う（証跡を残すため）</li>
              <li>・<strong>消費税</strong>は補助対象外の場合が多い（要確認）</li>
              <li>・人件費を計上する場合は<strong>タイムカード</strong>等の証拠が必要</li>
              <li>・<strong>自社関係者への外注</strong>は認められないことが多い</li>
            </ul>
          </KnowledgeBlock>
          <KnowledgeBlock title="2026年度の注目ポイント">
            <ul className="space-y-1 text-xs text-slate-600">
              <li>・<strong>賃上げ要件</strong>が多くの補助金で必須化・加点対象に</li>
              <li>・<strong>DX・GX対応</strong>が重要テーマとして予算拡充</li>
              <li>・<strong>KPI管理</strong>の厳格化：実現不可能な計画は不採択リスク高</li>
              <li>・<strong>電子申請</strong>が原則化（GBizIDプライムの早期取得を推奨）</li>
            </ul>
          </KnowledgeBlock>
        </div>
      ),
    },
    {
      id: "links",
      title: "便利なリンク集",
      icon: ExternalLink,
      content: (
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { name: "jGrants（補助金申請システム）", url: "https://www.jgrants-portal.go.jp/", desc: "デジタル庁運営の補助金ポータル" },
            { name: "GBizID", url: "https://gbiz-id.go.jp/top/", desc: "法人共通認証基盤" },
            { name: "ミラサポplus", url: "https://mirasapo-plus.go.jp/", desc: "中小企業向け補助金・支援施策検索" },
            { name: "J-Net21", url: "https://j-net21.smrj.go.jp/", desc: "中小機構の経営支援情報" },
            { name: "中小企業庁", url: "https://www.chusho.meti.go.jp/", desc: "補助金制度の元締め" },
            { name: "AMED", url: "https://www.amed.go.jp/", desc: "医療研究開発支援" },
            { name: "NEDO", url: "https://www.nedo.go.jp/", desc: "エネルギー・環境技術支援" },
            { name: "スマート補助金", url: "https://www.smart-hojokin.jp/", desc: "地方自治体の補助金検索" },
          ].map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-all hover:border-primary-300 hover:shadow-sm"
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-primary-500" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">{link.name}</h4>
                <p className="text-[10px] text-slate-500">{link.desc}</p>
              </div>
            </a>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">補助金ガイド・ナレッジベース</h2>
        <p className="text-xs text-slate-500">補助金申請に必要な知識をまとめました。初めての方はまず「基礎知識」から読みましょう。</p>
      </div>

      {sections.map((section) => {
        const Icon = section.icon;
        const isOpen = openSection === section.id;
        return (
          <div key={section.id} className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
            <button
              onClick={() => setOpenSection(isOpen ? null : section.id)}
              className="flex w-full items-center gap-3 p-5 text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
                <Icon className="h-4.5 w-4.5 text-primary-600" />
              </div>
              <h3 className="flex-1 text-sm font-bold text-slate-900">{section.title}</h3>
              {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-3">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   共有コンポーネント
   ================================================================ */

function KnowledgeBlock({
  title,
  children,
  variant = "default",
}: {
  title: string;
  children: React.ReactNode;
  variant?: "default" | "warning";
}) {
  return (
    <div className={`rounded-xl p-4 ${variant === "warning" ? "bg-red-50 border border-red-200" : "bg-slate-50"}`}>
      <h4 className={`mb-2 text-xs font-bold ${variant === "warning" ? "text-red-800" : "text-slate-800"}`}>{title}</h4>
      {children}
    </div>
  );
}
