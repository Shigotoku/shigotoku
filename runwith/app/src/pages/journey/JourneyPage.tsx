import { Link, useLocation } from "react-router-dom";
import {
  CheckCircle2, Circle, ArrowRight, Lock,
  Lightbulb, Building2, Banknote,
  Target, Trophy, Rocket, Crown, FileText,
  Sparkles, Presentation, Users, ExternalLink,
} from "lucide-react";
import { useCompanyStore, PHASE_LABELS, type StartupPhase } from "../../store/company";
import { useSubscriptionStore, PLAN_LABELS, type PlanTier } from "../../store/subscription";
import { useAuthStore } from "../../store/auth";
import { useProgressStore, TASK_IDS } from "../../store/progress";
import { useState, useEffect, useRef } from "react";

interface JourneyTask {
  id: string;
  label: string;
  description?: string;
  link?: string;
  linkState?: Record<string, string>;
  requiredPlan?: PlanTier;
  isMedical?: boolean;
  highlight?: boolean;
  infoText?: string;
}

interface JourneyPhase {
  phase: StartupPhase;
  icon: typeof Lightbulb;
  color: string;
  bgColor: string;
  description: string;
  tasks: JourneyTask[];
}

const journeyPhases: JourneyPhase[] = [
  {
    phase: "idea",
    icon: Lightbulb,
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-50",
    description: "アイデアを形にし、事業の方向性を固める段階",
    tasks: [
      { id: TASK_IDS.IDEA_BUSINESS_PLAN, label: "ビジネスアイデアを整理する", description: "解決したい課題、ターゲット顧客、提供価値を明文化", link: "/journey/business-idea" },
      { id: TASK_IDS.IDEA_MARKET_RESEARCH, label: "市場規模を算定する（TAM/SAM/SOM）", description: "トップダウン・ボトムアップ両方で算出", link: "/journey/market-size" },
      { id: TASK_IDS.IDEA_COMPETITOR_ANALYSIS, label: "競合分析を実施する", description: "主要競合のポジショニングマップを作成", link: "/journey/competitor-analysis" },
      { id: TASK_IDS.IDEA_PERSONA, label: "ターゲット顧客のペルソナを設計する", description: "理想的な顧客像を具体化", link: "/journey/persona" },
      { id: TASK_IDS.IDEA_BMC, label: "ビジネスモデルキャンバスを作成する", description: "9つの要素でビジネスモデルを可視化", link: "/journey/bmc" },
      { id: TASK_IDS.IDEA_NAMING, label: "ネーミング", description: "ネーミングに関するAIプロンプト生成で候補を検討", link: "/naming/generate" },
      { id: TASK_IDS.IDEA_TRADEMARK, label: "商標チェック", description: "J-PlatPatで商標調査、ドメイン確認", link: "/naming" },
      { id: TASK_IDS.IDEA_MEDICAL_PHARMA_CHECK, label: "【医療】薬機法の該当性を確認する", description: "自社製品が医療機器・医薬品に該当するか確認", isMedical: true, link: "/journey/pharma-check" },
    ],
  },
  {
    phase: "pre_founding",
    icon: Building2,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    description: "会社設立の手続きを進め、事業の基盤を構築する段階",
    tasks: [
      { id: TASK_IDS.PRE_BASICS, label: "基本事項を決定する", description: "会社形態、発起人・役員、資本金額、本店所在地を決定", link: "/journey/company-basics" },
      { id: TASK_IDS.PRE_SETUP_SERVICE, label: "会社設立サービス・代行を使う", description: "会社設立freee、マネーフォワード会社設立等のサービスを検討", highlight: true, link: "/incorporation" },
      { id: TASK_IDS.PRE_ARTICLES, label: "定款を作成する", description: "事業目的、株式、機関設計を記載", infoText: "法人設立ワンストップサービス（政府公認、無料）を使って申請される方は以下を進めてください。", link: "/incorporation", linkState: { openStep: "inc_articles_of_incorporation" } },
      { id: TASK_IDS.PRE_NOTARIZATION, label: "定款の公証人認証を受ける", description: "電子定款で印紙税4万円を節約可能", link: "/incorporation", linkState: { openStep: "inc_notarization" } },
      { id: TASK_IDS.PRE_CAPITAL_PAYMENT, label: "資本金を払い込む", description: "発起人個人口座に振込", link: "/incorporation", linkState: { openStep: "inc_capital_payment" } },
      { id: TASK_IDS.PRE_REGISTRATION, label: "法人登記を申請する", description: "法務局にオンライン or 窓口申請", link: "/incorporation", linkState: { openStep: "inc_registration" } },
      { id: TASK_IDS.PRE_POST_REGISTRATION, label: "登記後の手続き", description: "印鑑カード・法人口座・法人カード・GBizID・会計ソフトの導入", link: "/journey/post-registration" },
    ],
  },
  {
    phase: "founded",
    icon: FileText,
    color: "from-teal-500 to-emerald-500",
    bgColor: "bg-teal-50",
    description: "設立直後の届出や体制整備を行う段階",
    tasks: [
      { id: TASK_IDS.FOUNDED_TAX_NOTIF, label: "税務署へ法人設立届出書を提出", description: "設立から2ヶ月以内", link: "/notifications" },
      { id: TASK_IDS.FOUNDED_BLUE_RETURN, label: "青色申告の承認申請書を提出", description: "設立から3ヶ月以内（必須！節税の基本）", link: "/notifications" },
      { id: TASK_IDS.FOUNDED_SALARY_OFFICE, label: "給与支払事務所の開設届を提出", description: "役員報酬を支払う場合", link: "/notifications" },
      { id: TASK_IDS.FOUNDED_WITHHOLDING, label: "源泉所得税の納期特例の承認申請書", description: "従業員10人未満なら半年に一回の納付でOK", link: "/notifications" },
      { id: TASK_IDS.FOUNDED_CONSUMPTION_TAX, label: "消費税課税事業者届出書", description: "資本金1,000万円以上は設立時から課税事業者", link: "/notifications" },
      { id: TASK_IDS.FOUNDED_PREF_TAX, label: "法人事業税・住民税の届出（都道府県）", description: "都道府県税事務所へ提出", link: "/notifications" },
      { id: TASK_IDS.FOUNDED_CITY_TAX, label: "法人住民税の届出（市区町村）", description: "市区町村役所へ提出", link: "/notifications" },
      { id: TASK_IDS.FOUNDED_SOCIAL_INS, label: "社会保険（健康保険・厚生年金）加入手続き", description: "年金事務所へ提出（法人は強制加入）", link: "/notifications" },
      { id: TASK_IDS.FOUNDED_LABOR_INS, label: "労働保険の加入手続き", description: "従業員を雇う場合は労働基準監督署へ", link: "/notifications" },
      { id: TASK_IDS.FOUNDED_EMP_INS, label: "雇用保険の加入手続き", description: "ハローワークへ届出", link: "/notifications" },
      { id: TASK_IDS.FOUNDED_WORK_RULES, label: "就業規則を作成する", description: "10人以上で義務化。事前に作成推奨", link: "/labor" },
      { id: TASK_IDS.FOUNDED_CONTRACTS, label: "契約書テンプレートを整備する", description: "NDA、業務委託、利用規約等", link: "/contracts", requiredPlan: "growth" },
      { id: TASK_IDS.FOUNDED_TAX_CALENDAR, label: "税務カレンダーを設定する", description: "年間の申告・納付スケジュールを管理", link: "/tax-calendar", requiredPlan: "growth" },
      { id: TASK_IDS.FOUNDED_MEDICAL_CLINIC, label: "【医療】保健所への届出", description: "診療所・病院の開設届", isMedical: true, link: "/notifications" },
      { id: TASK_IDS.FOUNDED_MEDICAL_DEVICE, label: "【医療】医療機器製造販売業の許可申請", description: "PMDAへの事前相談を推奨", isMedical: true },
    ],
  },
  {
    phase: "seed",
    icon: Banknote,
    color: "from-emerald-500 to-green-500",
    bgColor: "bg-emerald-50",
    description: "プロダクトを開発し、初期顧客を獲得する段階",
    tasks: [
      { id: TASK_IDS.SEED_MVP, label: "MVP / プロトタイプを開発する", description: "最小限の機能で市場検証", link: "/journey/mvp" },
      { id: TASK_IDS.SEED_SIMULATION, label: "事業シミュレーションを作成する", description: "60ヶ月の収支予測を作成", link: "/simulator" },
      { id: TASK_IDS.SEED_MARKETING, label: "マーケティングを行う", description: "SEO、SNS、広告等で認知拡大", link: "/marketing" },
      { id: TASK_IDS.SEED_FUNDING_RESEARCH, label: "補助金・助成金を調査する", description: "IT導入補助金、ものづくり補助金等", link: "/funding", requiredPlan: "growth" },
      { id: TASK_IDS.SEED_STARTUP_LOAN, label: "創業融資を検討する", description: "日本政策金融公庫の新創業融資制度", link: "/funding", requiredPlan: "growth" },
      { id: TASK_IDS.SEED_BUSINESS_PLAN, label: "事業計画書を完成させる", description: "数値計画を含む本格的な事業計画", link: "/business-plan" },
      { id: TASK_IDS.SEED_IP_STRATEGY, label: "知財戦略を策定する", description: "特許・商標・意匠の出願計画", link: "/ip-management", requiredPlan: "growth" },
      { id: TASK_IDS.SEED_FIRST_CUSTOMERS, label: "初期顧客を獲得する（10社）", description: "PMFの検証", link: "/journey/first-customers" },
      { id: TASK_IDS.SEED_INTERVIEWS, label: "顧客インタビューを実施する", description: "ペインポイントの深掘り", link: "/journey/customer-interview" },
      { id: TASK_IDS.SEED_KPI, label: "KPIを設定し追跡を開始する", description: "MRR, Churn, LTV/CACの計測", link: "/kpi-tracker", requiredPlan: "growth" },
      { id: TASK_IDS.SEED_LEGAL_DOCS, label: "利用規約・プライバシーポリシーを整備する", description: "弁護士レビューを推奨", link: "/contracts", requiredPlan: "growth" },
      { id: TASK_IDS.SEED_MEDICAL_CLINICAL, label: "【医療】臨床研究計画を策定する", description: "倫理審査委員会への申請準備", isMedical: true },
      { id: TASK_IDS.SEED_MEDICAL_PMDA, label: "【医療】PMDA事前面談を実施する", description: "薬事戦略の確認", isMedical: true },
    ],
  },
  {
    phase: "early",
    icon: Target,
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50",
    description: "PMFを確認し、成長の基盤を作る段階",
    tasks: [
      { id: TASK_IDS.EARLY_PITCH, label: "ピッチデッキを作成する", description: "12枚の標準的なピッチ構成", link: "/pitch", requiredPlan: "growth" },
      { id: TASK_IDS.EARLY_INVESTOR, label: "エンジェル / VC投資家にアプローチ", description: "マッチングスコアで絞り込み", link: "/investor", requiredPlan: "pro" },
      { id: TASK_IDS.EARLY_ANGEL_TAX, label: "エンジェル税制の活用を検討する", description: "投資家に税優遇をアピール" },
      { id: TASK_IDS.EARLY_HIRING, label: "チームメンバーを採用する", description: "エンジニア、営業、CSの初期メンバー", link: "/team" },
      { id: TASK_IDS.EARLY_STOCK_OPTION, label: "ストックオプション制度を検討する", description: "採用競争力の強化", link: "/simulator", requiredPlan: "pro" },
      { id: TASK_IDS.EARLY_SALES_PROCESS, label: "セールスプロセスを構築する", description: "リード獲得→商談→クロージングの型化" },
      { id: TASK_IDS.EARLY_CUSTOMER_SUCCESS, label: "カスタマーサクセス体制を構築する", description: "オンボーディングフロー、チャーン防止" },
      { id: TASK_IDS.EARLY_PR, label: "PR・広報戦略を策定する", description: "メディア露出、プレスリリースの計画" },
      { id: TASK_IDS.EARLY_LABOR, label: "労務管理体制を整備する", description: "勤怠管理、36協定、有給管理", link: "/labor", requiredPlan: "growth" },
      { id: TASK_IDS.EARLY_MONTHLY_CLOSING, label: "月次決算のサイクルを確立する", description: "会計ソフトとの連携" },
    ],
  },
  {
    phase: "series_a",
    icon: Trophy,
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50",
    description: "本格的な資金調達を行い、事業を拡大する段階",
    tasks: [
      { id: TASK_IDS.SA_FUNDRAISING, label: "シリーズA資金調達を実施する", description: "1〜5億円規模の調達", link: "/investor", requiredPlan: "pro" },
      { id: TASK_IDS.SA_VALUATION, label: "企業価値評価を実施する", description: "DCF/マルチプル/ARR法", link: "/simulator", requiredPlan: "pro" },
      { id: TASK_IDS.SA_INVESTMENT_CONTRACT, label: "投資契約書を締結する", description: "条件交渉、優先株式の設計" },
      { id: TASK_IDS.SA_SHA, label: "株主間契約（SHA）を締結する", description: "投資家との権利義務を明確化" },
      { id: TASK_IDS.SA_STOCK_OPTIONS, label: "ストックオプション制度を設計・発行する", description: "税制適格SOのバリデーション", link: "/simulator", requiredPlan: "pro" },
      { id: TASK_IDS.SA_EXPANSION_PLAN, label: "事業拡大計画を策定する", description: "新市場進出、新機能開発", link: "/simulator" },
      { id: TASK_IDS.SA_ORG_SCALE, label: "組織体制を強化する（20→50名）", description: "ミドルマネジメントの配置", link: "/team" },
      { id: TASK_IDS.SA_HIRING_PLAN, label: "採用計画を策定する", description: "6-12ヶ月の採用ロードマップ", link: "/team" },
      { id: TASK_IDS.SA_SECURITY, label: "情報セキュリティ体制を構築する", description: "ISMS認証の検討" },
      { id: TASK_IDS.SA_ADVISORS, label: "顧問弁護士・税理士を選定する", description: "スタートアップに強い専門家" },
      { id: TASK_IDS.SA_MEDICAL_TRIAL, label: "【医療】治験計画届を提出する", description: "PMDAへの治験届", isMedical: true },
    ],
  },
  {
    phase: "series_b_plus",
    icon: Rocket,
    color: "from-indigo-500 to-blue-600",
    bgColor: "bg-indigo-50",
    description: "事業を本格スケールし、Exit戦略を検討する段階",
    tasks: [
      { id: TASK_IDS.SB_FUNDRAISING, label: "シリーズB以降の資金調達", description: "5億円〜数十億円規模", link: "/investor", requiredPlan: "pro" },
      { id: TASK_IDS.SB_DD, label: "DD（デューデリジェンス）対策を実施する", description: "財務・法務・事業DDの準備", link: "/dd-preparation", requiredPlan: "pro" },
      { id: TASK_IDS.SB_GOVERNANCE, label: "ガバナンス体制を強化する", description: "社外取締役の選任、取締役会の運営" },
      { id: TASK_IDS.SB_INTERNAL_CONTROL, label: "内部統制システムを構築する", description: "J-SOX対応準備" },
      { id: TASK_IDS.SB_OVERSEAS, label: "海外展開を検討する", description: "市場調査、現地パートナー" },
      { id: TASK_IDS.SB_CULTURE, label: "組織文化を明文化する", description: "ミッション・バリューの浸透" },
      { id: TASK_IDS.SB_HR_SYSTEM, label: "人事評価制度を整備する", description: "等級制度、評価基準、報酬テーブル" },
      { id: TASK_IDS.SB_MA, label: "M&A戦略の検討", description: "買収・被買収の両面から事業シナジーを検討", highlight: true },
      { id: TASK_IDS.SB_MEDICAL_APPROVAL, label: "【医療】医療機器の承認・認証を取得する", description: "PMDAへの承認申請", isMedical: true },
    ],
  },
  {
    phase: "pre_ipo",
    icon: Crown,
    color: "from-yellow-500 to-amber-500",
    bgColor: "bg-yellow-50",
    description: "IPO準備を本格化し、上場審査に備える段階",
    tasks: [
      { id: TASK_IDS.IPO_ROADMAP, label: "IPOロードマップを策定する", description: "N-3期からの準備スケジュール", link: "/ipo-roadmap", requiredPlan: "pro" },
      { id: TASK_IDS.IPO_UNDERWRITER, label: "主幹事証券会社を選定する", description: "大和、野村、SBI等" },
      { id: TASK_IDS.IPO_AUDITOR, label: "監査法人を選定する（ショートレビュー）", description: "あずさ、トーマツ、EY、PwC等" },
      { id: TASK_IDS.IPO_INTERNAL_AUDIT, label: "内部監査体制を構築する", description: "専任の内部監査部門" },
      { id: TASK_IDS.IPO_REGULATIONS, label: "規程類を整備する", description: "50〜80本の社内規程" },
      { id: TASK_IDS.IPO_PROSPECTUS, label: "Ⅰの部（有価証券届出書）を作成する", description: "上場申請書類の本体" },
      { id: TASK_IDS.IPO_REVIEW, label: "上場審査に対応する", description: "東証の審査部門とのQ&A" },
      { id: TASK_IDS.IPO_IR, label: "IR体制を構築する", description: "IR担当者の配置、IRサイトの構築" },
      { id: TASK_IDS.IPO_ROADSHOW, label: "ロードショーを実施する", description: "機関投資家への説明会" },
      { id: TASK_IDS.IPO_BOOKBUILDING, label: "株価を決定する（ブックビルディング）", description: "仮条件→需要積み上げ→公開価格" },
    ],
  },
  {
    phase: "post_exit",
    icon: Sparkles,
    color: "from-emerald-500 to-teal-400",
    bgColor: "bg-emerald-50",
    description: "上場後の経営、またはM&A後の統合フェーズ",
    tasks: [
      { id: TASK_IDS.EXIT_DISCLOSURE, label: "上場後の適時開示体制を運営する", description: "東証TDnet" },
      { id: TASK_IDS.EXIT_EARNINGS, label: "決算説明会を開催する", description: "四半期ごと" },
      { id: TASK_IDS.EXIT_SO_MANAGEMENT, label: "SO行使・ロックアップ管理", description: "上場後のSO行使ルール管理" },
      { id: TASK_IDS.EXIT_AGM, label: "株主総会を運営する", description: "年1回の定時株主総会" },
      { id: TASK_IDS.EXIT_NEXT_STRATEGY, label: "次のステージの事業戦略を策定する", description: "第二創業、新規事業" },
    ],
  },
];

export default function JourneyPage() {
  const location = useLocation();
  const { company } = useCompanyStore();
  const { canAccess } = useSubscriptionStore();
  const { isDemo } = useAuthStore();
  const { isDone, toggleTask } = useProgressStore();
  const isMedical = company?.isMedicalMode;
  const phaseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const computedPhaseIndex = (() => {
    for (let i = 0; i < journeyPhases.length; i++) {
      const tasks = journeyPhases[i].tasks.filter(t => !t.isMedical || isMedical);
      const allDone = tasks.every(t => isDone(t.id));
      if (!allDone) return i;
    }
    return journeyPhases.length - 1;
  })();
  const currentPhaseIndex = computedPhaseIndex;

  const scrollToPhase = (location.state as { scrollToPhase?: string } | null)?.scrollToPhase;
  const [expandedPhase, setExpandedPhase] = useState<StartupPhase | null>(
    (scrollToPhase as StartupPhase) || journeyPhases[computedPhaseIndex]?.phase || "idea"
  );

  useEffect(() => {
    if (scrollToPhase && phaseRefs.current[scrollToPhase]) {
      setTimeout(() => {
        phaseRefs.current[scrollToPhase]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [scrollToPhase]);

  const getTaskStatus = (task: JourneyTask): "done" | "pending" => {
    return isDone(task.id) ? "done" : "pending";
  };

  const getPhaseCounts = (phase: JourneyPhase) => {
    const tasks = phase.tasks.filter(t => !t.isMedical || isMedical);
    const done = tasks.filter(t => isDone(t.id)).length;
    return { done, total: tasks.length };
  };

  const totalTasks = journeyPhases.reduce((sum, p) => sum + p.tasks.filter(t => !t.isMedical || isMedical).length, 0);
  const totalDone = journeyPhases.reduce((sum, p) => sum + p.tasks.filter(t => (!t.isMedical || isMedical) && isDone(t.id)).length, 0);
  const overallPercent = Math.round((totalDone / totalTasks) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ジャーニーマップ</h1>
          <p className="mt-1 text-sm text-slate-500">
            全{totalTasks}タスク中 {totalDone}タスク完了 — タスクをクリックして完了にできます
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600">{overallPercent}%</p>
          <p className="text-xs text-slate-500">全体進捗</p>
        </div>
      </div>

      {/* 全体進捗バー */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">スタートアップの旅路</span>
          <span className="text-slate-500">{totalDone} / {totalTasks}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 via-violet-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${overallPercent}%` }}
          />
        </div>

        {/* フェーズナビゲーター */}
        <div className="mt-4 grid grid-cols-9 gap-1">
          {journeyPhases.map((jp, i) => {
            const { done, total } = getPhaseCounts(jp);
            const isCurrent = i === currentPhaseIndex;
            const isPast = i < currentPhaseIndex;
            const allDone = done === total;
            return (
              <button
                key={jp.phase}
                onClick={() => setExpandedPhase(expandedPhase === jp.phase ? null : jp.phase)}
                title={PHASE_LABELS[jp.phase]}
                className="flex flex-col items-center gap-1"
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                  allDone ? "bg-emerald-500 text-white" :
                  isCurrent ? "bg-primary-600 text-white ring-2 ring-primary-200" :
                  isPast ? "bg-primary-100 text-primary-700" :
                  "bg-slate-200 text-slate-500"
                }`}>
                  {allDone ? "✓" : i + 1}
                </div>
                <div className={`h-1 w-full rounded-full ${allDone ? "bg-emerald-400" : isPast || isCurrent ? "bg-primary-300" : "bg-slate-200"}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* フェーズカード */}
      <div className="space-y-3">
        {journeyPhases.map((jp, phaseIndex) => {
          const Icon = jp.icon;
          const { done, total } = getPhaseCounts(jp);
          const tasksToShow = jp.tasks.filter(t => !t.isMedical || isMedical);
          const isCurrentPhase = phaseIndex === currentPhaseIndex;
          const isExpanded = expandedPhase === jp.phase;
          const isPast = phaseIndex < currentPhaseIndex;
          const allDone = done === total;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <div
              key={jp.phase}
              ref={(el) => { phaseRefs.current[jp.phase] = el; }}
              className={`rounded-2xl border bg-white shadow-sm transition-all ${
                isCurrentPhase ? "border-primary-300 ring-2 ring-primary-100" :
                allDone ? "border-emerald-200" :
                "border-slate-200/60"
              }`}
            >
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : jp.phase)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/50 rounded-2xl"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${jp.color} text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">{PHASE_LABELS[jp.phase]}</h2>
                    {isCurrentPhase && (
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">現在</span>
                    )}
                    {allDone && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">完了</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{jp.description}</p>
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                  <span className="text-xs font-semibold text-slate-700">{done}/{total}</span>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r transition-all ${jp.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{percent}%</span>
                </div>
                <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  <div className="space-y-1">
                    {tasksToShow.map((task) => {
                      const done = isDone(task.id);
                      const locked = !isDemo && task.requiredPlan && !canAccess(task.link?.replace("/", "") || "");

                      return (
                        <div key={task.id}>
                          {task.infoText && (
                            <div className="mx-3 mb-1 mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                              <p className="text-xs font-medium text-blue-800">{task.infoText}</p>
                            </div>
                          )}
                          <div
                            className={`rounded-xl border transition-all ${
                              task.highlight
                                ? done
                                  ? "border-emerald-100 bg-emerald-50/40"
                                  : "border-amber-300 bg-amber-50 ring-1 ring-amber-200"
                                : done
                                ? "border-emerald-100 bg-emerald-50/40"
                                : task.link && !locked
                                ? "border-slate-100 bg-white hover:border-primary-200 hover:bg-primary-50/30 hover:shadow-sm"
                                : "border-transparent bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <button
                                onClick={() => toggleTask(task.id)}
                                className="shrink-0"
                                title={done ? "未完了に戻す" : "完了にする"}
                              >
                                {done ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-slate-300 hover:text-slate-400" />
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`text-sm font-medium ${done ? "text-slate-400 line-through" : task.highlight ? "text-amber-900 font-bold" : "text-slate-800"}`}>
                                    {task.label}
                                  </span>
                                  {task.isMedical && (
                                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">医療</span>
                                  )}
                                  {task.requiredPlan && task.requiredPlan !== "free" && !isDemo && (
                                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                      task.requiredPlan === "pro" ? "bg-accent-100 text-accent-700" : "bg-primary-100 text-primary-700"
                                    }`}>
                                      {PLAN_LABELS[task.requiredPlan]}
                                    </span>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="mt-0.5 text-xs text-slate-400">{task.description}</p>
                                )}
                              </div>

                              {task.link && !done && (
                                <Link
                                  to={task.link}
                                  state={{ fromJourney: true, returnPhase: jp.phase, ...(task.linkState || {}) }}
                                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                    locked
                                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                      : "bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow"
                                  }`}
                                  onClick={e => e.stopPropagation()}
                                >
                                  {locked ? <Lock className="h-3 w-3" /> : <ArrowRight className="h-3.5 w-3.5" />}
                                  開始
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* フェーズ完了ボタン */}
                  {done < total && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs text-slate-400">このフェーズ: {done}/{total} 完了</span>
                      <button
                        onClick={() => {
                          tasksToShow.forEach(t => {
                            if (!isDone(t.id)) toggleTask(t.id);
                          });
                        }}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                      >
                        全て完了にする
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
