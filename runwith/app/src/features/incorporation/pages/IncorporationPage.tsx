import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCompanyStore } from "../../../store/company";
import { useAuthStore } from "../../../store/auth";
import { getStorageJson } from "../../../lib/companyStorage";
import {
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Info,
  ChevronDown,
  Globe,
  ShieldCheck,
  Clock,
  Zap,
  Smartphone,
  Bot,
  Copy,
  Check,
  Landmark,
} from "lucide-react";
import { useProgressStore, TASK_IDS } from "../../../store/progress";

interface Step {
  id: string;
  stepNum: number;
  title: string;
  description: string;
  details: string[];
  links?: { label: string; url: string }[];
  tips?: string[];
  warnings?: string[];
  cost?: string;
  duration?: string;
}

const incorporationSteps: Step[] = [
  {
    id: TASK_IDS.INC_FORM,
    stepNum: 1,
    title: "会社形態の決定",
    description: "株式会社・合同会社・医療法人を比較して選択",
    cost: "なし",
    duration: "1〜3日",
    details: [
      "【株式会社】信用力◎ 出資と経営を分離可能 設立費用：約24〜25万円",
      "【合同会社】設立費用が安い（約10万円）意思決定が早い 信用力は株式会社に劣る",
      "【医療法人】医療事業を行う場合に検討 設立要件が厳格 社員総会・理事会が必要",
    ],
    tips: [
      "将来VCからの出資・IPOを検討するなら株式会社一択",
      "合同会社→株式会社への組織変更は後からでも可能（費用6万円程度）",
      "医療機器・デジタルヘルスなら株式会社でOK。診療所を開設するなら医療法人も検討",
    ],
  },
  {
    id: TASK_IDS.INC_BASICS,
    stepNum: 2,
    title: "基本事項の決定",
    description: "商号・事業目的・本店所在地・資本金・事業年度を決定",
    cost: "なし",
    duration: "1〜3日",
    details: [
      "商号（会社名）：商標チェック済みの名前を使用（ネーミングツールで確認）",
      "事業目的：定款に記載する事業内容を5〜10項目程度（将来の展開も見越して広めに）",
      "本店所在地：自宅・バーチャルオフィス可（一部銀行はバーチャルオフィス不可）",
      "資本金：1円から可能だが100〜500万円が標準（1,000万円未満は初年度消費税免税）",
      "事業年度：決算月は設立月から最も遠い月に設定するのが節税上有利",
      "取締役：最低1名 任期は最長10年（非公開会社）",
    ],
    tips: [
      "資本金1,000万円未満なら設立1〜2期目は消費税免税",
      "事業目的は「前各号に附帯関連する一切の業務」を最後に加えると幅広く対応可能",
    ],
    warnings: ["商号に使える文字・禁止文字あり（法務局サイト参照）"],
    links: [
      { label: "ネーミング＆商標チェック", url: "/naming" },
      { label: "法務局：商号の使用可能文字", url: "https://www.moj.go.jp/MINJI/minji44.html" },
    ],
  },
  {
    id: TASK_IDS.INC_ARTICLES,
    stepNum: 3,
    title: "定款の作成",
    description: "会社の基本ルールを定めた書類を作成（電子定款推奨）",
    cost: "印紙代4万円（電子定款は不要）",
    duration: "2〜5日",
    details: [
      "【絶対的記載事項】商号、事業目的、本店所在地、資本金、発起人の氏名・住所",
      "【相対的記載事項】株式の譲渡制限（非公開会社化）、取締役会の設置、監査役の設置等",
      "【任意的記載事項】事業年度、株主総会の招集方法、役員報酬の決定方法等",
      "電子定款：PDFをAcrobat等で電子署名→公証役場に電子申請（印紙代4万円が不要）",
    ],
    tips: [
      "電子定款にすると印紙代4万円が節約できる（行政書士に頼むと費用3〜5万円程度）",
      "ひとり会社なら取締役会・監査役は不要でシンプルな機関設計に",
      "株式の譲渡制限を設けると非公開会社になり、取締役任期を最長10年に延長可能",
    ],
    links: [
      { label: "定款テンプレート（法務局）", url: "https://www.moj.go.jp/MINJI/minji06_00028.html" },
      { label: "電子公証システム", url: "https://www.koshonin.gr.jp/business/e-notarization" },
      { label: "法人設立ワンストップサービス（定款認証対応）", url: "https://app.e-oss.myna.go.jp/Application/ecOssTop/" },
    ],
  },
  {
    id: TASK_IDS.INC_NOTARIZATION,
    stepNum: 4,
    title: "定款の認証（株式会社のみ）",
    description: "公証役場で定款の認証を受ける",
    cost: "約5万円（認証手数料3〜5万円+謄本代）",
    duration: "1〜3日",
    details: [
      "公証役場に事前予約を入れる（最寄りの公証役場に電話 or Web予約）",
      "必要書類：定款3通（又は電子定款）、発起人全員の印鑑証明書（3ヶ月以内）",
      "2022年〜テレビ電話による認証も可能（遠方でもOK）",
      "電子定款の場合：マイナンバーカードまたは電子証明書が必要",
    ],
    tips: [
      "合同会社は定款認証が不要（工程をスキップ）",
      "電子定款ならオンラインで認証手続きが完結する場合も",
    ],
    links: [
      { label: "公証役場一覧", url: "https://www.koshonin.gr.jp/list" },
    ],
  },
  {
    id: TASK_IDS.INC_CAPITAL,
    stepNum: 5,
    title: "資本金の払い込み",
    description: "発起人の個人口座に資本金を振り込んで払込証明書を作成",
    cost: "振込手数料のみ",
    duration: "1日",
    details: [
      "発起人代表者の個人普通預金口座に資本金を振り込む",
      "通帳のコピーを取得（表紙・1ページ目・振込明細が確認できるページ）",
      "払込証明書を作成（定款の写し＋通帳コピーを綴じて代表者が記名・押印）",
      "ネット銀行の場合：アプリの取引明細画面のスクリーンショットまたはPDF出力で代替可能",
    ],
    tips: [
      "この時点ではまだ法人口座がないので個人口座に振り込む",
      "振込日は必ず定款認証日以降にすること（以前だと無効になる）",
      "資本金は設立後すぐに法人口座に移す",
      "ネット銀行（住信SBIネット銀行・楽天銀行・PayPay銀行など）は通帳なしでも明細PDFで対応可能",
    ],
    warnings: ["振込日が定款作成日より前だと払込証明書が無効になります"],
    links: [
      { label: "住信SBIネット銀行（口座開設）", url: "https://www.netbk.co.jp/contents/lp/open/index.html" },
      { label: "楽天銀行（口座開設）", url: "https://www.rakuten-bank.co.jp/open/index.html" },
      { label: "PayPay銀行（口座開設）", url: "https://www.paypay-bank.co.jp/kojin/entry/" },
    ],
  },
  {
    id: TASK_IDS.INC_REGISTRATION,
    stepNum: 6,
    title: "法人設立登記の申請",
    description: "法務局に設立登記を申請する（この日が設立日になります）",
    cost: "登録免許税：株式会社15万円、合同会社6万円",
    duration: "申請後1〜2週間で完了",
    details: [
      "必要書類一式：設立登記申請書、定款（原本）、払込証明書、取締役就任承諾書、印鑑届出書、OCR用紙等",
      "申請方法：①法務局の窓口 ②郵送 ③オンライン（登記・供託オンライン申請）",
      "登記完了後：登記簿謄本（履歴事項全部証明書）・印鑑証明書を取得",
      "印鑑カード交付申請書も同時に提出",
    ],
    tips: [
      "申請日 = 会社設立日になるので縁起の良い日・月初めを選ぶ人も",
      "オンライン申請は24時間可能で窓口に行く必要がない（IC カードリーダー必要）",
      "登記完了後は謄本を5〜10通取得しておくと各種手続きに使える",
    ],
    links: [
      { label: "法人設立ワンストップサービス", url: "https://app.e-oss.myna.go.jp/Application/ecOssTop/" },
      { label: "登記・供託オンライン申請", url: "https://www.touki-kyoutaku-online.moj.go.jp/" },
      { label: "法務局 商業・法人登記", url: "https://houmukyoku.moj.go.jp/homu/houjin2.html" },
    ],
  },
  {
    id: TASK_IDS.INC_POST_NOTIFICATIONS,
    stepNum: 7,
    title: "設立後の届出・口座開設",
    description: "税務署・年金事務所・自治体等への届出と口座開設を進める",
    cost: "なし（登録費用は別途）",
    duration: "2〜4週間",
    details: [
      "【税務署】法人設立届出書（2ヶ月以内）、青色申告承認申請書（3ヶ月以内）",
      "【都道府県税事務所・市区町村】法人設立届出書",
      "【年金事務所】健康保険・厚生年金保険 新規適用届",
      "【法人口座】ネット銀行から優先的に申し込む（銀行口座開設ページへ）",
      "【法人カード】設立直後でも申請できるカードを選ぶ",
    ],
    tips: [
      "青色申告の申請を3ヶ月以内に忘れずに！逃すと初年度から青色使えない",
      "届出ナビページで全届出を管理できます",
    ],
    links: [
      { label: "届出・手続きナビ", url: "/notifications" },
      { label: "銀行口座開設ガイド", url: "/bank" },
      { label: "e-Tax（国税電子申告）", url: "https://www.e-tax.nta.go.jp/" },
    ],
  },
];

export default function IncorporationPage() {
  const location = useLocation();
  const companyId = useCompanyStore((s) => s.company?.id);
  const isDemo = useAuthStore((s) => s.isDemo);
  const [activeTab, setActiveTab] = useState<"steps" | "guide" | "special">("steps");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showAiTool, setShowAiTool] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const [aiForm, setAiForm] = useState({
    companyName: "",
    purpose: "",
    capital: "100",
    address: "",
    founderName: "",
    fiscalMonth: "3",
    companyType: "株式会社",
  });
  const [basicsLoaded, setBasicsLoaded] = useState(false);

  useEffect(() => {
    const state = location.state as { openStep?: string } | null;
    if (state?.openStep) {
      setExpandedStep(state.openStep);
      setActiveTab("steps");
      setTimeout(() => {
        const el = document.getElementById(`step-${state.openStep}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const basics = await getStorageJson<{
          companyType?: string;
          companyName?: string;
          capitalAmount?: string;
          address?: string;
          representativeName?: string;
          businessPurposes?: string;
          fiscalYearEnd?: string;
        }>("company-basics-data", companyId, isDemo);
        if (cancelled || !basics) return;
        const hasData = basics.companyType || basics.companyName || basics.capitalAmount || basics.address;
        if (hasData) {
          setAiForm((prev) => ({
            ...prev,
            companyType: basics.companyType || prev.companyType,
            companyName: basics.companyName || prev.companyName,
            capital: basics.capitalAmount || prev.capital,
            address: basics.address || prev.address,
            founderName: basics.representativeName
              ? `${basics.representativeName}${basics.address ? `（${basics.address}）` : ""}`
              : prev.founderName,
            purpose: basics.businessPurposes || prev.purpose,
            fiscalMonth: basics.fiscalYearEnd || prev.fiscalMonth,
          }));
          setBasicsLoaded(true);
        }
      } catch { /* ignore */ }
    })();

    return () => { cancelled = true; };
  }, [companyId, isDemo]);

  const generateAiPrompt = () => {
    return `以下の情報をもとに、${aiForm.companyType}の定款（草案）を作成してください。

【会社の基本情報】
・会社の種類：${aiForm.companyType}
・商号：${aiForm.companyName || "（商号を入力）"}
・本店所在地：${aiForm.address || "（住所を入力）"}
・資本金：${aiForm.capital}万円
・事業年度（決算月）：${aiForm.fiscalMonth}月末日

【事業目的】
${aiForm.purpose || "（事業目的を記入）"}

【発起人】
・${aiForm.founderName || "（発起人の氏名・住所を記入）"}

【要件】
・絶対的記載事項（目的・商号・本店所在地・発行可能株式総数・設立に際して出資される財産の価額・発起人の氏名・住所）を正確に記載してください
・相対的記載事項として「株式の譲渡制限」「取締役会を置かない旨」を記載してください
・任意的記載事項として事業年度・株主総会の招集方法・役員報酬の決定方法を記載してください
・電子定款として公証役場に提出できる形式で作成してください
・一般的な非公開会社（ひとり株式会社）を想定してシンプルな機関設計にしてください
・各条文に番号を付け、法的に適切な文体で作成してください`;
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generateAiPrompt()).then(() => {
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2000);
    });
  };
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [showWsGuide, setShowWsGuide] = useState(false);
  const { isDone, toggleTask, getCompletedCount } = useProgressStore();

  const completedCount = getCompletedCount(incorporationSteps.map((s) => s.id));
  const totalSteps = incorporationSteps.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  // ─── 問診ガイドデータ ───────────────────────────────────
  type RecType = "yes" | "no" | "depends" | "required";
  interface QItem {
    id: string;
    section: string;
    q: string;
    simple: string;
    detail: string;
    rec: RecType;
    recReason: string;
    special?: string;
  }

  const recConfig: Record<RecType, { label: string; color: string }> = {
    yes:      { label: "「はい」を推奨",    color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    no:       { label: "「いいえ」でOK",   color: "bg-slate-100 text-slate-700 border-slate-200" },
    depends:  { label: "状況による",        color: "bg-amber-100 text-amber-800 border-amber-200" },
    required: { label: "必須！「はい」",    color: "bg-blue-100 text-blue-800 border-blue-200" },
  };

  const qaItems: QItem[] = [
    // Section 1
    {
      id: "q1", section: "商業登記電子証明書",
      q: "設立登記と同時に商業登記電子証明書の発行申請をしますか？",
      simple: "会社の「電子的な実印」を設立と同時に作りますか？という質問です。",
      detail: `商業登記電子証明書は会社の電子的な証明書で、以下のシチュエーションで使います：

【使う場面①】e-Taxによる電子申告
法人税・消費税・源泉所得税の電子申告時に電子署名として使用できます。ただしe-Taxは別途「利用者識別番号」でも申告可能なため、この証明書がなくても申告は可能。

【使う場面②】電子定款の公証認証
定款を電子ファイルで作成し、公証役場に電子申請する際に使用。ただし代替手段として「司法書士への依頼」「freee会社設立等のサービス」でも対応可能。

【使う場面③】登記申請の電子申請（法務局）
オンライン登記申請（登記ねっと）で代理人なしに自分で申請する場合に使用。

【使う場面④】電子入札・行政手続き
国や地方公共団体の電子入札、各種行政手続きの電子申請に使用。医療機器製造販売業の申請等でも使用するケースあり。

【使う場面⑤】電子契約・電子署名
取引先との契約書にクラウドサービス（DocuSign等）を使わず、自社の電子署名として使用する場合。

設立と同時に申請する最大のメリットは「法人番号取得と同時に処理できること」。後から申請すると別途手続きが必要になります。ただし法務省の専用ソフトのインストールが必要です。`,
      rec: "depends",
      recReason: "行政手続き（医療機器申請・電子入札等）を予定しているなら「はい」で設立と同時に取得しておくと後が楽。IT系・SaaS系でe-Tax電子申告が主な用途なら「いいえ」でも問題なし。迷うなら「はい」を推奨（後から取得より手間が少ない）。",
      special: "医療系スタートアップは医療機器製造販売業の各種申請・PMDA電子申請等で商業登記電子証明書が必要になることがあります。設立時に一緒に取得しておくことを推奨。",
    },
    {
      id: "q2", section: "商業登記電子証明書",
      q: "法務省の専用ソフト（鍵ペアファイル・証明書発行申請ファイル）を作成しましたか？",
      simple: "Q1で「はい」を選んだ場合のみ表示される質問です。Q1で「いいえ」なら無視してOK。",
      detail: "商業登記電子証明書を取得するには法務省の「商業登記電子認証ソフト」をインストールし、①鍵ペアファイルと②SHINSEIファイル（証明書発行申請ファイル）の2つを作成する必要があります。法務省サイトから無料でダウンロードできます。Q1で「いいえ」を選べばこの質問は表示されません。",
      rec: "depends",
      recReason: "Q1で「はい」を選んだ場合のみ関係します。ソフトをインストールしてファイルを作成済みなら「はい」。Q1で「いいえ」なら関係なし。",
    },
    {
      id: "q2b", section: "商業登記電子証明書",
      q: "（Q1で「はい」の場合）設立後に改めて電子証明書を申請しますか？",
      simple: "設立と同時に申請せず、後から別途申請する場合のルートについての質問です。",
      detail: "設立時に電子証明書の申請をしなかった場合でも、法人設立後に「法人番号を取得してから別途申請」が可能です。また、設立後に代表者が就任した場合なども後から申請できます。ただし後から申請する場合は法務局への別途手続きが必要になります。",
      rec: "depends",
      recReason: "Q1で「はい」を選んでいれば、通常この質問は「いいえ」（設立と同時に申請済みのため）。Q1で「いいえ」を選んで後から必要になった場合のルートです。",
    },
    // Section 2: 定款・設立登記
    {
      id: "q3", section: "定款・設立登記",
      q: "定款は作成済みですか？",
      simple: "会社のルールブック（定款）はもう完成していますか？",
      detail: "定款は会社設立の根本規則をまとめた書類です。絶対的記載事項（目的・商号・本店所在地・出資額・発起人の氏名）を必ず記載する必要があります。設立ステップ3で作成します。この質問に答える時点では定款が完成しているはずです。",
      rec: "yes",
      recReason: "設立登記の前提として定款が必要。ステップ3で完成させてから問診を進めましょう。まだの場合は先に設立ナビのステップ3を完了させてください。",
    },
    {
      id: "q3b", section: "定款・設立登記",
      q: "設立する会社は、持分会社ではなく株式会社ですか？",
      simple: "合同会社・合資会社・合名会社ではなく、株式会社を設立しますか？",
      detail: "持分会社とは「合同会社・合資会社・合名会社」の総称です。株式会社か持分会社（合同会社等）かによって手続きが異なります。スタートアップが多い「合同会社（LLC）」も持分会社に含まれます。株式会社の場合は「はい」、合同会社等の場合は「いいえ」を選びます。",
      rec: "depends",
      recReason: "株式会社なら「はい」。合同会社（LLC）・合資会社・合名会社を設立するなら「いいえ」。VCからの出資を想定しているなら株式会社を強く推奨（「はい」）。",
    },
    {
      id: "q3c", section: "定款・設立登記",
      q: "作成済みの定款は、公証役場の公証人による認証を受けていますか？",
      simple: "定款を公証役場（公証人）に認証してもらう手続きは完了していますか？",
      detail: `株式会社の設立には「公証人による定款認証」が必要です。

【定款認証の手順】
1. 公証役場に自分で電話し、面談の予約を取る（オンライン予約不可の場合あり）
2. 予約した日時に公証役場へ出向くか、電子定款の場合はオンライン嘱託で対応
3. 公証人に定款の内容を確認してもらい認証を受ける

※ 法人設立ワンストップサービスは定款認証の「予約・面談」を代行するわけではありません。電子定款の送付（嘱託）はオンラインで可能ですが、公証人との事前確認・予約は自分で行う必要があります。

【認証を受けるには2つの方法があります】
・紙の定款：印紙代4万円 + 認証手数料約5万円（資本金100万円超の場合）
・電子定款（freee会社設立等のサービス利用）：印紙代0円 + 認証手数料約3万円（資本金100万円未満の場合）

合同会社の場合は公証人による定款認証は不要です。`,
      rec: "depends",
      recReason: "株式会社で認証済みなら「はい」。まだ認証を受けていない場合は「いいえ」を選ぶと、ワンストップサービス上で電子定款の嘱託手続きに案内されます。合同会社なら関係なし。",
    },
    // Section 3: 税務届出
    {
      id: "q4", section: "税務届出",
      q: "青色申告の承認申請をしますか？",
      simple: "節税の基本「青色申告」を利用しますか？という質問です。",
      detail: "青色申告にするメリットは大きい。①赤字を最大10年間繰り越せる、②30万円未満の備品を一括経費にできる、③給与所得控除（青色事業専従者給与）が使える、④各種特別控除が受けられる。設立後3ヶ月以内に申請しないと初年度から使えなくなります。",
      rec: "required",
      recReason: "絶対に「はい」！青色申告は節税の基本中の基本。提出期限（設立後3ヶ月以内）を絶対に守ること。",
    },
    {
      id: "q5", section: "税務届出",
      q: "棚卸資産の評価方法の届出をしますか？（最終仕入原価法以外にする場合）",
      simple: "在庫（商品・原材料）の価値をどう計算するか、特別な方法を選びますか？",
      detail: "届出なしの場合は自動的に「最終仕入原価法」が適用されます。業種によっては別の方法（先入先出法・移動平均法等）が有利なケースもありますが、設立初期はデフォルトで問題なし。在庫管理が複雑な小売・製造業は税理士に相談を。",
      rec: "no",
      recReason: "IT系・サービス業・SaaSなど在庫を持たない事業なら「いいえ」でOK。物販・製造業の場合は税理士に相談。",
      special: "医療機器・試薬など在庫を持つ医療系スタートアップは要検討。",
    },
    {
      id: "q6", section: "税務届出",
      q: "減価償却資産の償却方法を定額法にするための届出をしますか？",
      simple: "機械や設備の費用を毎年同じ金額で経費にしますか（定額法）、それとも最初に多く計上しますか（定率法）？",
      detail: "届出なし = 自動的に「定率法」になります。定率法は最初の年に多く経費にできるため、設備投資をした初期にキャッシュが厳しいスタートアップには有利です。「定額法」を選ぶと毎年均等に経費化されます。建物・ソフトウェアは定額法のみ。",
      rec: "no",
      recReason: "届出なし（定率法）のほうがスタートアップには有利なことが多い。設備投資した年に多く経費化できるため節税効果が高い。",
    },
    {
      id: "q7", section: "税務届出",
      q: "有価証券の一単位あたりの帳簿価額の計算方法の届出をしますか？",
      simple: "株式などの価値をどう計算するか、特別な方法を選びますか？",
      detail: "届出なしの場合は「移動平均法」が適用されます。株式投資や有価証券の売買を事業の一部として頻繁に行う場合にのみ関係します。設立初期には通常関係ありません。",
      rec: "no",
      recReason: "通常の事業会社には無関係。証券会社・ファンド等でなければ「いいえ」でOK。",
    },
    {
      id: "q8", section: "税務届出",
      q: "法人税の申告期限を2ヶ月から延長しますか？",
      simple: "決算後の税金申告の締め切りを延ばしますか？",
      detail: "通常、法人税の申告期限は決算日から2ヶ月以内。監査法人が定時株主総会前に監査を完了できない場合（大企業・上場準備中等）に1ヶ月延長できます。税務署への事前申請が必要。",
      rec: "no",
      recReason: "設立初期は「いいえ」でOK。上場準備で監査法人を選任してから、必要に応じて申請すれば十分。",
    },
    {
      id: "q9", section: "税務届出",
      q: "法人住民税・法人事業税の申告期限を延長しますか？",
      simple: "都道府県や市区町村への税金申告の締め切りを延ばしますか？",
      detail: "法人税の申告期限延長を申請した場合、連動して都道府県・市区町村への申告期限も延長申請できます。Q8で「いいえ」なら、この質問も「いいえ」でOK。",
      rec: "no",
      recReason: "Q8と同様、設立初期は不要。「いいえ」で進めましょう。",
    },
    {
      id: "q10", section: "消費税",
      q: "消費税の課税事業者を選択しますか？（資本金1,000万円未満の場合）",
      simple: "本来は免税なのに、あえて消費税を払う事業者になりますか？",
      detail: "資本金1,000万円未満の設立初年度は「免税事業者」で消費税の納税が不要です。ただし、大きな設備投資（医療機器・サーバー等）をした年は、あえて課税事業者になることで消費税の「還付」を受けられる場合があります。BtoB取引かつインボイス登録済みの場合は影響あり。",
      rec: "no",
      recReason: "設備投資が少なければ免税のメリットを活かして「いいえ」がベスト。大規模な設備投資を予定している場合は税理士に相談。",
      special: "医療機器購入（数千万円〜）を予定している医療系スタートアップは課税事業者選択で還付が受けられる可能性。必ず税理士に相談を。",
    },
    {
      id: "q11", section: "消費税",
      q: "消費税の簡易課税制度を選択しますか？",
      simple: "消費税の計算を「売上の一定割合」で簡単に計算する方法を選びますか？",
      detail: "通常の消費税計算は「売上の消費税 − 仕入の消費税」。簡易課税は「売上の消費税 × みなし仕入率」で計算します。業種によって有利・不利が変わります。IT・サービス業（第5種）はみなし仕入率50%のため不利なことが多い。前々年度の売上5,000万円以下が条件。",
      rec: "depends",
      recReason: "業種・規模によって損得が変わります。設立初期は「いいえ」にして、売上規模が見えてきたら税理士に試算してもらうのがベスト。",
    },
    {
      id: "q12", section: "消費税",
      q: "消費税の還付を3ヶ月または毎月受けるための届出をしますか？",
      simple: "消費税の還付を通常より早く（年1回でなく四半期または毎月）受けますか？",
      detail: "大きな仕入れが先行する場合（医療機器の購入、大量在庫の先払い等）に消費税の還付が発生します。通常は年1回の申告時ですが、届出で四半期または毎月に早期化できます。手続きは増えますが、キャッシュフローの改善に繋がります。",
      rec: "no",
      recReason: "初年度の設備投資が少なければ不要。大きな初期投資がある場合のみ検討。医療機器を初年度に大量購入する医療系スタートアップは要検討。",
      special: "医療機器（数千万円〜）を初期購入する場合は還付申告の早期化が資金繰りに大きく影響します。",
    },
    {
      id: "q13", section: "消費税",
      q: "消費税の確定申告期限を1ヶ月延長しますか？",
      simple: "消費税の申告締め切りを1ヶ月延ばしますか？",
      detail: "法人税の申告期限延長（Q8）をした場合に、消費税も1ヶ月延長できます。ただし延長した場合でも「利子税」が発生します。",
      rec: "no",
      recReason: "通常不要。Q8でも「いいえ」を選んでいれば関係なし。",
    },
    {
      id: "q14", section: "源泉所得税",
      q: "源泉所得税の納期の特例の承認申請をしますか？",
      simple: "毎月払う源泉税（給与から天引きした所得税）を年2回まとめて払う制度を使いますか？",
      detail: "通常、給与から天引きした源泉所得税は翌月10日までに毎月納付する義務があります。「納期の特例」を申請すると、1〜6月分を7月10日、7〜12月分を翌年1月20日の年2回にまとめられます。従業員10人未満の会社が対象で、事務負担が大幅に軽減されます。",
      rec: "required",
      recReason: "従業員10人未満のスタートアップは必ず「はい」！毎月の納付事務が半分になります。設立直後に申請すれば初月から適用可能。",
    },
    {
      id: "q15", section: "源泉所得税",
      q: "e-Taxの利用者識別番号・暗証番号を保有していますか？",
      simple: "国税のオンライン申告サービス「e-Tax」のIDはすでに持っていますか？",
      detail: "e-Taxは確定申告・法人税申告・源泉所得税の電子納付などに使うオンラインサービスです。利用者識別番号（16桁）は法人設立後にe-Taxのサイトまたは税務署で取得できます。まだ持っていなければ「いいえ」と答えて後から取得できます。",
      rec: "depends",
      recReason: "すでに持っていれば「はい」。まだなら「いいえ」で進め、設立後すぐにe-Taxのサイトで取得しましょう。",
    },
    {
      id: "q16", section: "役員報酬・賞与",
      q: "役員に対して賞与（ボーナス）を支給する予定がありますか？",
      simple: "社長や役員に決算賞与・ボーナスを払う予定はありますか？",
      detail: "役員への賞与は、事前に金額・支給日を税務署に届け出る「事前確定届出給与」として申告すれば法人の損金（経費）にできます。届出なしで支給すると経費にならず、税金が無駄になります。支給予定の2ヶ月前までに届出が必要です。",
      rec: "depends",
      recReason: "役員に賞与を払う予定があれば「はい」。役員報酬（毎月定額）のみで賞与は払わないなら「いいえ」でOK。迷うなら税理士に相談を。",
    },
    {
      id: "q17", section: "役員報酬・賞与",
      q: "役員への賞与等を株式で支給しますか？",
      simple: "役員に現金ではなく株式でボーナスを渡す予定がありますか？",
      detail: "「株式報酬」「リストリクテッド・ストック」などの仕組みを使う場合に関係します。通常のスタートアップでは設立初期には採用しません。ストックオプションとは別の話です。",
      rec: "no",
      recReason: "通常のスタートアップは「いいえ」でOK。株式報酬を設計する場合は弁護士・税理士との相談が必須。",
    },
    {
      id: "q18", section: "インボイス",
      q: "適格請求書発行事業者（インボイス）に登録しますか？",
      simple: "2023年から始まった「インボイス制度」に登録して、取引先が消費税の控除を受けられるようにしますか？",
      detail: "インボイス（適格請求書）登録をすると、あなたの会社に支払った消費税を取引先が「仕入税額控除」として節税できるようになります。BtoB（法人・個人事業主向け）取引が多い場合は登録しないと取引を断られるケースも。BtoC（消費者向け）のみなら登録不要。ただし登録すると消費税の納税義務が生じます（免税の特例が使えなくなる場合あり）。",
      rec: "depends",
      recReason: "BtoB取引がある場合は「はい」で登録推奨。消費者向けサービスのみなら「いいえ」も選択肢。設立直後は取引先の要望を確認してから判断するのが現実的。",
      special: "医療（保険診療）はインボイス不要なケースあり。ただし医療機器販売・SaaS販売は要登録。事業内容で判断を。",
    },
    // Section 3: 社会保険・労働
    {
      id: "q19", section: "所在地・社会保険",
      q: "法人設立の所在地は東京23区ですか？",
      simple: "会社の住所は東京23区の中にありますか？",
      detail: "東京都特別区（23区）に本店を置く場合、都税事務所への届出先が特殊になります。この質問は届出先を決めるためのものです。",
      rec: "depends",
      recReason: "所在地のまま正直に回答してください。23区内なら「はい」、それ以外なら「いいえ」。",
    },
    {
      id: "q20", section: "所在地・社会保険",
      q: "地方公共団体に指定された地域に新たに事業所を設けますか？",
      simple: "全国の特定の市区町村に、新しく事業所（オフィス）を作りますか？",
      detail: "指定された都市（東京23区・大阪市・横浜市等多数）への事業所新設の届出に関する質問です。本店所在地とは別に支店・営業所を設ける場合が主な対象。",
      rec: "depends",
      recReason: "設立時は本店のみなら「いいえ」でOK。後から支店を出す際に改めて届出が必要になります。",
    },
    {
      id: "q21", section: "社会保険",
      q: "既に個人事業として健康保険・厚生年金に加入していますか？（法人成りの場合）",
      simple: "個人事業から法人に変える場合に表示される質問です。",
      detail: "個人事業主が法人化（法人成り）する場合、既存の社会保険をどう引き継ぐかの確認です。新規設立（最初から法人）の場合はこの質問は「いいえ」でOKです。",
      rec: "no",
      recReason: "最初から法人設立する場合は「いいえ」。個人事業から法人成りする場合のみ「はい」の可能性あり。",
    },
    {
      id: "q22", section: "社会保険",
      q: "社会保険（健康保険・厚生年金保険）に新規加入しますか？",
      simple: "会社で社会保険に入りますか？",
      detail: "法人（株式会社・合同会社等）は役員1人だけでも社会保険（健康保険・厚生年金）への加入が法律で義務付けられています。これは避けることができません。年金事務所へ「健康保険・厚生年金保険 新規適用届」を提出します。",
      rec: "required",
      recReason: "法人は強制加入のため「はい」一択です！加入しないと法律違反になります。保険料は会社と本人の折半。",
    },
    {
      id: "q23", section: "労働保険",
      q: "既に個人事業として労働保険（労災・雇用保険）に加入していますか？",
      simple: "個人事業から法人にする場合：前から労働保険に入っていますか？",
      detail: "法人成りの場合のみ関係する質問です。新規設立の場合は「いいえ」でOKです。",
      rec: "no",
      recReason: "新規設立なら「いいえ」。法人成りの場合は状況に応じて回答。",
    },
    {
      id: "q24", section: "労働保険",
      q: "従業員（労働者）を1人でも雇っていますか？",
      simple: "社員（役員以外の従業員）を1人でも採用していますか？",
      detail: "役員のみの会社は労働保険（労災・雇用保険）への加入義務がありません。ただし、アルバイト・パートを含む従業員を1人でも雇用する場合は加入が必要です（農林水産業・建設業の一部を除く）。",
      rec: "depends",
      recReason: "役員のみ（従業員ゼロ）なら「いいえ」。従業員を採用したら必ず「はい」。採用予定があれば「はい」で進めておくと届出準備ができます。",
    },
    {
      id: "q25", section: "労働保険",
      q: "農林水産業または建設業（二元適用事業）ですか？",
      simple: "農業・林業・水産業・建設業を営んでいますか？",
      detail: "これらの業種は労働保険の処理方法が一般の事業と異なります（二元適用事業）。IT・医療・サービス業等は通常「いいえ」です。",
      rec: "no",
      recReason: "IT・医療・サービス業等は「いいえ」でOK。",
    },
    {
      id: "q26", section: "労働保険",
      q: "雇用保険の加入手続きをしますか？",
      simple: "万が一の失業に備える雇用保険に入りますか？",
      detail: "週20時間以上・31日以上の雇用見込みがある従業員がいる場合は雇用保険加入が義務です。対象外（役員のみ、短時間労働のみ等）であれば不要。ハローワークで「雇用保険被保険者資格取得届」を提出します。",
      rec: "depends",
      recReason: "正社員・フルタイムパートを雇う場合は「はい」必須。役員のみなら「いいえ」。採用予定があれば「はい」で手続きを開始しましょう。",
    },
  ];

  const sections = [...new Set(qaItems.map(q => q.section))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">会社設立ナビ</h1>
        <p className="mt-1 text-sm text-slate-500">
          会社設立の全ステップ、法人設立ワンストップサービスの問診解説、特殊ケースまで完全ガイド。
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-slate-600">
            <span className="font-semibold text-slate-800">①設立ナビ</span> → まずここから7ステップを確認
          </span>
          <span className="text-slate-300">|</span>
          <span className="inline-flex items-center gap-1 text-slate-600">
            <span className="font-semibold text-blue-700">②問診ガイド</span> → ワンストップサービスの問診に答える時に参照
          </span>
          <span className="text-slate-300">|</span>
          <span className="inline-flex items-center gap-1 text-slate-600">
            <span className="font-semibold text-violet-700">③特殊ケース</span> → 子供株主・外国人・医療系等の特別対応
          </span>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-1 rounded-2xl border border-slate-200/60 bg-slate-100 p-1">
        {[
          { id: "steps" as const, label: "設立ナビ（7ステップ）" },
          { id: "guide" as const, label: "問診ガイド" },
          { id: "special" as const, label: "特殊ケース" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: 設立ステップ ─── */}
      {activeTab === "steps" && (
        <div className="space-y-6">
          {/* ワンストップサービス紹介バナー */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">法人設立ワンストップサービス</h2>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">政府公式</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    マイナンバーカード1枚で定款認証から設立登記・各省庁届出まで全手続きをオンライン完結。
                  </p>
                  <p className="mt-1 text-[11px] text-blue-700 font-medium">
                    📍 出番：ステップ3（定款作成）〜 ステップ6（設立登記申請）で使います
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWsGuide(!showWsGuide)}
                className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                {showWsGuide ? "閉じる" : "使い方を見る"}
              </button>
            </div>

            {showWsGuide && (
              <div className="mt-5 space-y-4 border-t border-blue-100 pt-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { icon: Zap, title: "印紙代4万円節約", desc: "電子定款認証に対応。収入印紙代4万円が不要。" },
                    { icon: Smartphone, title: "自宅から全手続き完結", desc: "公証役場・法務局・税務署・年金事務所への申請をまとめてオンラインで。" },
                    { icon: ShieldCheck, title: "申請状況をリアルタイム確認", desc: "マイナポータルで受理・完了状況が確認できます。" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-xl border border-blue-100 bg-white p-3.5 shadow-sm">
                        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                          <Icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-xs font-bold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href="https://app.e-oss.myna.go.jp/Application/ecOssTop/" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
                    サービスを開く <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setActiveTab("guide")}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  >
                    問診ガイドを見る <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {!showWsGuide && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a href="https://app.e-oss.myna.go.jp/Application/ecOssTop/" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  サービスを開く <ExternalLink className="h-3 w-3" />
                </a>
                <button onClick={() => setActiveTab("guide")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800">
                  問診がわからない方はこちら <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* 進捗 */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">設立進捗</p>
              <p className="text-sm font-bold text-primary-600">{completedCount} / {totalSteps} ステップ完了</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "株式会社の費用", value: "約25万円〜", sub: "登記免許税15万+定款認証5万+印紙等" },
                { label: "合同会社の費用", value: "約10万円〜", sub: "登記免許税6万+その他（定款認証不要）" },
                { label: "設立完了の目安", value: "2〜3週間", sub: "書類準備→認証→登記申請→完了" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-lg font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs font-medium text-slate-600">{s.label}</p>
                  <p className="text-[11px] text-slate-400">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-xs leading-relaxed text-blue-800">
                各ステップをクリックすると詳細が表示されます。「完了にする」を押すと進捗が自動保存され、ダッシュボードにも反映されます。
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {incorporationSteps.map((step) => {
              const done = isDone(step.id);
              const isExpanded = expandedStep === step.id;
              return (
                <div key={step.id} id={`step-${step.id}`} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                  done ? "border-emerald-200" : isExpanded ? "border-primary-300 ring-1 ring-primary-100" : "border-slate-200/60"
                }`}>
                  <button onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                    }`}>
                      {done ? "✓" : step.stepNum}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-sm font-bold ${done ? "text-slate-400 line-through" : "text-slate-900"}`}>{step.title}</h3>
                      <p className="text-xs text-slate-500">{step.description}</p>
                      {done && (step.id === TASK_IDS.INC_FORM || step.id === TASK_IDS.INC_BASICS) && basicsLoaded && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          基本事項の決定ページで入力済み
                        </span>
                      )}
                    </div>
                    <div className="hidden shrink-0 items-center gap-3 text-xs text-slate-400 sm:flex">
                      {step.cost && <span>{step.cost}</span>}
                      {step.duration && <><span className="text-slate-300">|</span><span>{step.duration}</span></>}
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-slate-100 px-5 py-4">
                      <div className="flex gap-3 text-xs text-slate-500 sm:hidden">
                        {step.cost && <span>費用: {step.cost}</span>}
                        {step.duration && <span>期間: {step.duration}</span>}
                      </div>
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">詳細</h4>
                        <ul className="space-y-2">
                          {step.details.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {step.warnings && step.warnings.length > 0 && (
                        <div className="rounded-xl bg-red-50 p-3">
                          <p className="mb-1 text-xs font-semibold text-red-700">注意</p>
                          {step.warnings.map((w, i) => (
                            <p key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />{w}
                            </p>
                          ))}
                        </div>
                      )}
                      {step.tips && step.tips.length > 0 && (
                        <div className="rounded-xl bg-amber-50 p-3">
                          <p className="mb-1 text-xs font-semibold text-amber-800">ポイント</p>
                          {step.tips.map((tip, i) => (
                            <p key={i} className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
                              <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />{tip}
                            </p>
                          ))}
                        </div>
                      )}
                      {step.links && step.links.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">参考リンク</h4>
                          <div className="flex flex-wrap gap-2">
                            {step.links.map((link) => {
                              const isExternal = link.url.startsWith("http");
                              return isExternal ? (
                                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100">
                                  {link.label}<ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <a key={link.url} href={link.url}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100">
                                  {link.label}<ArrowRight className="h-3 w-3" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── Step1・2専用：基本事項の決定ページリンク ── */}
                      {(step.id === TASK_IDS.INC_FORM || step.id === TASK_IDS.INC_BASICS) && (
                        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                          <p className="text-sm font-bold text-primary-800">基本事項の決定ページで入力</p>
                          <p className="mt-1 text-xs text-primary-600">
                            会社形態、商号、発起人、資本金、本店所在地、事業目的、事業年度、取締役をまとめて入力・保存できます。
                            入力した内容は定款作成のAIプロンプトにも自動反映されます。
                          </p>
                          <Link
                            to="/journey/company-basics"
                            state={{ fromJourney: true }}
                            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                          >
                            基本事項の決定ページを開く <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      )}

                      {/* ── Step3専用：AI定款生成ツール ── */}
                      {step.id === TASK_IDS.INC_ARTICLES && (
                        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                          <button
                            onClick={() => setShowAiTool(!showAiTool)}
                            className="flex w-full items-center gap-2 text-left"
                          >
                            <Bot className="h-4 w-4 text-violet-600" />
                            <span className="flex-1 text-sm font-semibold text-violet-800">
                              AIで定款の草案を作成する
                            </span>
                            <span className="rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              おすすめ
                            </span>
                            <ChevronDown className={`h-4 w-4 text-violet-500 transition-transform ${showAiTool ? "rotate-180" : ""}`} />
                          </button>
                          <p className="mt-1.5 text-xs text-violet-600">
                            情報を入力してプロンプトを生成 → ChatGPT / Claude にコピペして定款草案を取得
                          </p>
                          {showAiTool && (
                            <div className="mt-4 space-y-3">
                              {basicsLoaded && (
                                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  基本事項の決定ページで入力した情報が自動反映されています
                                </div>
                              )}
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">会社の種類</label>
                                  <select
                                    value={aiForm.companyType}
                                    onChange={e => setAiForm(f => ({ ...f, companyType: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  >
                                    <option>株式会社</option>
                                    <option>合同会社</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">商号（会社名）</label>
                                  <input
                                    type="text"
                                    placeholder="例：メディトク株式会社"
                                    value={aiForm.companyName}
                                    onChange={e => setAiForm(f => ({ ...f, companyName: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">資本金（万円）</label>
                                  <input
                                    type="number"
                                    value={aiForm.capital}
                                    onChange={e => setAiForm(f => ({ ...f, capital: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">決算月</label>
                                  <select
                                    value={aiForm.fiscalMonth}
                                    onChange={e => setAiForm(f => ({ ...f, fiscalMonth: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  >
                                    {[...Array(12)].map((_, i) => (
                                      <option key={i + 1} value={String(i + 1)}>{i + 1}月</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="mb-1 block text-xs font-medium text-slate-600">本店所在地</label>
                                  <input
                                    type="text"
                                    placeholder="例：東京都渋谷区〇〇1-2-3"
                                    value={aiForm.address}
                                    onChange={e => setAiForm(f => ({ ...f, address: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="mb-1 block text-xs font-medium text-slate-600">発起人の氏名・住所</label>
                                  <input
                                    type="text"
                                    placeholder="例：山田太郎（東京都新宿区〇〇1-2）"
                                    value={aiForm.founderName}
                                    onChange={e => setAiForm(f => ({ ...f, founderName: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="mb-1 block text-xs font-medium text-slate-600">事業目的（複数行可）</label>
                                  <textarea
                                    rows={3}
                                    placeholder={"例：\n1. 医療機器の開発・製造・販売\n2. 医療情報システムの開発・提供\n3. 前各号に附帯関連する一切の業務"}
                                    value={aiForm.purpose}
                                    onChange={e => setAiForm(f => ({ ...f, purpose: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  />
                                </div>
                              </div>
                              <div className="rounded-lg border border-violet-200 bg-white p-3">
                                <p className="mb-2 text-xs font-semibold text-slate-600">生成されるプロンプトのプレビュー</p>
                                <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600 line-clamp-4">
                                  {generateAiPrompt().substring(0, 200)}...
                                </pre>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={handleCopyPrompt}
                                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-700"
                                >
                                  {aiCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                  {aiCopied ? "コピーしました！" : "プロンプトをコピー"}
                                </button>
                                <a
                                  href="https://chat.openai.com/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  ChatGPTを開く
                                </a>
                                <a
                                  href="https://claude.ai/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Claudeを開く
                                </a>
                                <a
                                  href="https://gemini.google.com/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Geminiを開く
                                </a>
                              </div>
                              <p className="text-[11px] text-violet-500">
                                ※ AIが生成した定款は必ず法律の専門家（行政書士・司法書士）に確認してもらうことを推奨します
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Step5専用：ネット銀行おすすめパネル ── */}
                      {step.id === TASK_IDS.INC_CAPITAL && (
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-sky-600" />
                            <span className="text-sm font-semibold text-sky-800">個人ネット銀行の活用がおすすめ</span>
                          </div>
                          <p className="mb-3 text-xs text-sky-700">
                            払い込みに使う個人口座は<strong>ネット銀行</strong>が便利です。通帳レス口座でも取引明細のPDA出力・スクリーンショットで払込証明書に対応できます。手数料が安く、スマホだけで手続きが完結します。
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {[
                              { name: "住信SBIネット銀行", desc: "振込手数料が安く、法人口座開設も後から可能", color: "bg-blue-50 border-blue-200", url: "https://www.netbk.co.jp/contents/lp/open/index.html" },
                              { name: "楽天銀行", desc: "楽天経済圏利用者に◎ 明細PDFのダウンロードが簡単", color: "bg-rose-50 border-rose-200", url: "https://www.rakuten-bank.co.jp/open/index.html" },
                              { name: "PayPay銀行", desc: "スマホ完結・即日開設可能。手数料が明快", color: "bg-amber-50 border-amber-200", url: "https://www.paypay-bank.co.jp/kojin/entry/" },
                            ].map(bank => (
                              <a
                                key={bank.name}
                                href={bank.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex flex-col gap-1 rounded-lg border p-3 transition-all hover:shadow-sm ${bank.color}`}
                              >
                                <span className="text-xs font-semibold text-slate-800">{bank.name}</span>
                                <span className="text-[11px] text-slate-500">{bank.desc}</span>
                                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary-600">
                                  口座開設ページ <ExternalLink className="h-3 w-3" />
                                </span>
                              </a>
                            ))}
                          </div>
                          <p className="mt-2 text-[11px] text-slate-400">
                            ※ 設立後の法人口座開設は別途（銀行口座開設ナビを参照）
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
                        <button onClick={() => toggleTask(step.id)}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                            done ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}>
                          <CheckCircle2 className="h-4 w-4" />
                          {done ? "未完了に戻す" : "このステップを完了にする"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 外部会社設立サービス */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-base font-bold text-slate-900">会社設立サービス・代行を使う</h2>
              <p className="mt-1 text-sm text-slate-500">書類作成から登記申請まで代行・サポートしてくれるサービスです。</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { name: "freee 会社設立", by: "freee株式会社", price: "無料", badge: "人気No.1", badgeColor: "bg-blue-100 text-blue-700", features: ["電子定款で印紙代節約", "設立後freee会計と連携", "登記書類を自動作成"], desc: "質問に答えるだけで定款・設立書類を自動作成。", url: "https://www.freee.co.jp/kigyou/", color: "border-blue-200 bg-blue-50/30", iconBg: "bg-blue-600" },
                { name: "マネーフォワード クラウド会社設立", by: "マネーフォワード", price: "無料", badge: "会計連携◎", badgeColor: "bg-violet-100 text-violet-700", features: ["電子定款対応", "MFクラウド会計と連携", "設立後の届出もサポート"], desc: "MFクラウド会計とシームレスに連携。", url: "https://biz.moneyforward.com/establish/", color: "border-violet-200 bg-violet-50/30", iconBg: "bg-violet-600" },
                { name: "弥生 会社設立", by: "弥生株式会社", price: "無料", badge: "老舗安心", badgeColor: "bg-emerald-100 text-emerald-700", features: ["電子定款対応", "弥生会計と連携", "サポートが手厚い"], desc: "30年以上の実績。設立から経理まで一貫サポート。", url: "https://www.yayoi-kk.co.jp/kaisyasetsuritsu/", color: "border-emerald-200 bg-emerald-50/30", iconBg: "bg-emerald-600" },
                { name: "GMO電子印鑑 Agree 設立パック", by: "GMOグローバルサイン", price: "有料", badge: "電子署名特化", badgeColor: "bg-orange-100 text-orange-700", features: ["電子署名対応", "電子定款作成", "法人印鑑セット"], desc: "電子署名・電子定款に特化。マイナンバーカード不要。", url: "https://agree.gmo.jp/", color: "border-orange-200 bg-orange-50/30", iconBg: "bg-orange-500" },
                { name: "司法書士・行政書士に依頼", by: "各種専門家", price: "5〜15万円", badge: "プロに任せる", badgeColor: "bg-slate-100 text-slate-700", features: ["書類作成を全部代行", "定款認証に同行", "登記申請を代行"], desc: "複雑なケース（医療法人・外資系等）は専門家に依頼が確実。", url: "https://houmukyoku.moj.go.jp/homu/houjin.html", color: "border-slate-200 bg-slate-50/30", iconBg: "bg-slate-600" },
                { name: "法人設立ワンストップサービス（政府公式）", by: "デジタル庁", price: "無料", badge: "政府公式", badgeColor: "bg-red-100 text-red-700", features: ["マイナンバーカードで完結", "定款認証から登記まで", "各省庁届出も一括"], desc: "マイナンバーカード1枚でオンライン完結。最もコストを抑えられる。", url: "https://app.e-oss.myna.go.jp/Application/ecOssTop/", color: "border-red-200 bg-red-50/30", iconBg: "bg-red-600" },
              ].map((svc) => (
                <div key={svc.name} className={`rounded-2xl border p-4 transition-all hover:shadow-md ${svc.color}`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${svc.iconBg} text-xs font-bold text-white`}>{svc.name[0]}</div>
                      <div>
                        <p className="text-xs font-semibold leading-tight text-slate-800">{svc.name}</p>
                        <p className="text-[10px] text-slate-500">{svc.by}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${svc.badgeColor}`}>{svc.badge}</span>
                  </div>
                  <p className="mb-2 text-[11px] leading-relaxed text-slate-600">{svc.desc}</p>
                  <div className="mb-3 space-y-1">
                    {svc.features.map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />{f}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-white/50 pt-2">
                    <span className="text-xs font-semibold text-slate-700">{svc.price}</span>
                    <a href={svc.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700">
                      詳しく見る <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-amber-50 p-3">
              <p className="text-[11px] text-amber-700">
                <span className="font-semibold">選び方のヒント：</span>
                freee・マネーフォワード・弥生はそれぞれの会計ソフトと連携するため、後で使う予定の会計ソフトに合わせて選ぶのがおすすめです。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ワンストップ問診ガイド ─── */}
      {activeTab === "guide" && (
        <div className="space-y-6">
          {/* What is this guide */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-bold text-blue-900">このガイドの使い方</p>
            <p className="mt-1.5 text-sm leading-relaxed text-blue-800">
              <span className="font-semibold">「法人設立ワンストップサービス」の問診</span>で聞かれる質問を、わかりやすく解説するガイドです。
              ワンストップサービスを開いて問診を進めながら、このページを参照して「何を選べばいいか」を確認してください。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="https://app.e-oss.myna.go.jp/Application/ecOssTop/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                ワンストップサービスを別タブで開く <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Flow diagram */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-bold text-slate-900">会社設立の全体フロー</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { num: "1", label: "事前準備", sub: "商号・定款・発起人の手配", color: "bg-slate-50 border-slate-200", numBg: "bg-slate-200 text-slate-700", active: false },
                { num: "2", label: "定款認証", sub: "公証役場に予約・面談（株式会社のみ）", color: "bg-slate-50 border-slate-200", numBg: "bg-slate-200 text-slate-700", active: false },
                { num: "3", label: "ワンストップサービスを開く", sub: "↓ここからがこのガイドの範囲", color: "bg-blue-50 border-blue-300 ring-1 ring-blue-300", numBg: "bg-blue-500 text-white", active: true },
                { num: "4", label: "問診に回答", sub: "このガイドで確認しながら答える", color: "bg-blue-50 border-blue-300 ring-1 ring-blue-300", numBg: "bg-blue-500 text-white", active: true },
                { num: "5", label: "申請・電子署名", sub: "マイナンバーカードで電子署名して送信", color: "bg-slate-50 border-slate-200", numBg: "bg-slate-200 text-slate-700", active: false },
                { num: "6", label: "審査・完了", sub: "法務局・税務署への届出完了", color: "bg-emerald-50 border-emerald-200", numBg: "bg-emerald-500 text-white", active: false },
              ].map((step, i, arr) => (
                <div key={step.num} className="relative">
                  <div className={`h-full rounded-xl border p-3 ${step.color}`}>
                    <div className={`mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${step.numBg}`}>{step.num}</div>
                    <p className="text-xs font-bold leading-snug text-slate-800">{step.label}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{step.sub}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="absolute -right-1.5 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
                      <ArrowRight className="h-3 w-3 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              <span className="font-semibold">問診の目的：</span>
              あなたの会社に必要な届出手続き（税務署・年金事務所・ハローワーク等への届出）を自動でリストアップし、まとめて申請するためのヒアリングです。
            </div>
          </div>

          {/* Q&A sections */}
          {sections.map((section) => {
            const sectionItems = qaItems.filter(q => q.section === section);
            return (
              <div key={section} className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">{section}</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {sectionItems.map((item) => {
                    const isOpen = expandedQ === item.id;
                    const rec = recConfig[item.rec];
                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => setExpandedQ(isOpen ? null : item.id)}
                          className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-slate-50/50"
                        >
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                            Q
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-500">{item.q}</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-900">{item.simple}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`hidden rounded-lg border px-2.5 py-1 text-[10px] font-bold sm:inline-block ${rec.color}`}>
                              {rec.label}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-5 pb-5 pt-4">
                            <div className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-bold ${rec.color}`}>
                              {rec.label}
                            </div>
                            <div className="rounded-xl bg-white p-4 shadow-sm">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">詳しい説明</p>
                              <p className="text-sm leading-relaxed text-slate-700">{item.detail}</p>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">推奨する理由</p>
                              <p className="text-sm leading-relaxed text-emerald-800">{item.recReason}</p>
                            </div>
                            {item.special && (
                              <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-600">医療系スタートアップの注意点</p>
                                <p className="text-sm leading-relaxed text-violet-800">{item.special}</p>
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
          })}

          <div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-700">
            ※ 本ガイドは一般的なスタートアップ向けの参考情報です。個別の状況によって最適な回答は異なります。重要な税務・法務の判断は税理士・司法書士・弁護士にご相談ください。
          </div>
        </div>
      )}

      {/* ─── TAB 3: 特殊ケース ─── */}
      {activeTab === "special" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-sm font-semibold text-violet-900">特殊なケースと注意点</p>
            <p className="mt-1 text-xs text-violet-700">通常の設立とは異なる対応が必要なケースをまとめました。該当するものがあれば専門家への相談を推奨します。</p>
          </div>

          {[
            {
              id: "child",
              title: "子供（未成年者）を株主にする場合",
              badge: "要注意",
              badgeColor: "bg-amber-100 text-amber-700",
              icon: "👶",
              summary: "相続税対策として子供に株式を持たせる場合、いくつかの特別な手続きと税務上の注意が必要です。",
              items: [
                {
                  subtitle: "法的な手続き",
                  content: [
                    "未成年者は単独で法律行為（株式の取得・議決権行使等）ができないため、親権者（法定代理人）の同意・代理が必要です",
                    "株式申込書・株主名簿への記載には「未成年者の氏名 + 法定代理人の親権者名」を記載し、法定代理人の署名・捺印が必要",
                    "株主総会での議決権行使も親権者が代理で行います",
                    "複数の親権者がいる場合（離婚後共同親権等）は全員の同意が原則必要",
                  ]
                },
                {
                  subtitle: "贈与税の注意点",
                  content: [
                    "親から子への株式贈与は「贈与税」の対象になります",
                    "年間110万円以下の贈与は贈与税の基礎控除内で非課税",
                    "設立時の出資（発起人として資本金を払い込む）の場合は、子供自身の財産（お年玉・贈与済みの預貯金等）から出資する必要があります",
                    "親の財産から子供名義で払い込むと「名義株」とみなされ、税務調査で問題になる可能性があります",
                  ]
                },
                {
                  subtitle: "相続税対策としての活用",
                  content: [
                    "会社設立初期（株価が低い段階）で子供に株式を持たせると、将来の相続時に株価が上昇した分を非課税で移転できる",
                    "毎年110万円以内で計画的に贈与する「暦年贈与」の活用が有効",
                    "2024年から相続時精算課税制度の非課税枠（年110万円）が新設され、使いやすくなった",
                    "具体的な節税策は税理士に相談することを強く推奨します",
                  ]
                },
                {
                  subtitle: "子供を取締役にできるか？",
                  content: [
                    "未成年でも取締役になることは会社法上可能です（制限なし）",
                    "ただし法的責任（取締役の善管注意義務・忠実義務等）が発生するため、実務上は成年後に就任するのが一般的",
                    "親が実質的に経営しながら子供が代表取締役になる形は税務上も問題になりやすい",
                  ]
                },
              ],
              caution: "名義株（実際の出資者と名義人が異なる株式）は税務調査の重大リスクです。子供の固有財産（贈与済み・相続済みの財産）から出資することを必ず守ってください。",
            },
            {
              id: "foreign",
              title: "外国人・外国法人が株主になる場合",
              badge: "要確認",
              badgeColor: "bg-blue-100 text-blue-700",
              icon: "🌏",
              summary: "外国人・外国法人が日本法人の株主（出資者）になる場合、外為法（外国為替及び外国貿易法）の規制に注意が必要です。",
              items: [
                {
                  subtitle: "外為法による事前届出",
                  content: [
                    "外国投資家が対内直接投資を行う場合、業種によっては財務省・事業所管省庁への「事前届出」が必要",
                    "規制業種の例：医療（医療器具・薬品）、通信、放送、国防・安全保障関連、農林水産、航空、海運など",
                    "医療系スタートアップは外国人株主を入れる場合は必ず確認が必要",
                    "事後届出で済む場合（10%未満の取得等）もあり、専門家に確認を",
                  ]
                },
                {
                  subtitle: "株主の本人確認書類",
                  content: [
                    "外国人株主の場合はパスポートコピー＋居住国の証明書類が必要",
                    "外国法人が株主になる場合は現地の登記簿謄本（アポスティーユ認証付き）等が必要",
                    "英語以外の言語の場合は翻訳文も必要",
                  ]
                },
                {
                  subtitle: "配当・株式譲渡時の税務",
                  content: [
                    "外国人株主への配当は源泉徴収税率が異なる（租税条約で軽減される場合あり）",
                    "株式譲渡益への課税も居住地国との租税条約を確認する必要がある",
                  ]
                },
              ],
              caution: "医療・セキュリティ関連の事業は外国人株主比率に規制がかかる可能性があります。設立前に弁護士または財務省の窓口で確認してください。",
            },
            {
              id: "medical",
              title: "医療系スタートアップの特殊対応",
              badge: "医療特化",
              badgeColor: "bg-emerald-100 text-emerald-700",
              icon: "🏥",
              summary: "医療機器・デジタルヘルス・診療所開設など、医療系の事業は通常の設立と異なる許認可・規制への対応が必要です。",
              items: [
                {
                  subtitle: "事業形態の選択",
                  content: [
                    "【株式会社でOK】医療機器開発・販売、デジタルヘルス・SaaS、医療AIの開発・提供、CRO・SMO",
                    "【医療法人が必要】診療所・病院の開設・運営（保険診療）",
                    "【注意】医療法人は非営利原則があり、利益分配（配当）が原則禁止。VCからの出資も困難なケースあり",
                    "デジタルヘルスやAI診断支援ツールは株式会社で設立し、医療機関と提携する形が主流",
                  ]
                },
                {
                  subtitle: "医療機器への該当性確認（最重要）",
                  content: [
                    "自社製品が「医療機器」「体外診断用医薬品」に該当するか、PMDAへの事前確認が必須",
                    "該当する場合は「医療機器製造販売業許可」「製造業登録」が必要",
                    "プログラム医療機器（SaMD）は2021年以降の規制強化で特に注意",
                    "該当性確認は無料でPMDA相談室（03-3506-9457）または書面相談で可能",
                  ]
                },
                {
                  subtitle: "保険診療と自由診療",
                  content: [
                    "保険診療：診療報酬点数に縛られるが患者負担が低く集客しやすい",
                    "自由診療（美容・検診・遠隔診療等）：収益性が高いが全額患者負担",
                    "混合診療は原則禁止（例外：先進医療等）",
                  ]
                },
                {
                  subtitle: "設立後の主な規制・許認可",
                  content: [
                    "薬機法（医薬品医療機器等法）：医療機器・医薬品の製造販売に関する規制",
                    "個人情報保護法＋医療情報の取り扱い（3省2ガイドライン）：医療情報システムの安全管理",
                    "保健所への届出：診療所開設時は開設の10日前までに届出が必要",
                  ]
                },
              ],
              caution: "医療系スタートアップは設立前にPMDA・弁護士（薬事専門）へ相談することを強く推奨します。規制違反は事業停止に直結します。",
            },
            {
              id: "virtual",
              title: "バーチャルオフィス・自宅を本店所在地にする場合",
              badge: "確認事項あり",
              badgeColor: "bg-slate-100 text-slate-700",
              icon: "🏠",
              summary: "初期コスト削減のため自宅やバーチャルオフィスを本店所在地にするケースが多いですが、いくつかの制約があります。",
              items: [
                {
                  subtitle: "バーチャルオフィスの注意点",
                  content: [
                    "GMOあおぞらネット銀行・住信SBIネット銀行はバーチャルオフィスでも法人口座を開設できる",
                    "三菱UFJ・三井住友などメガバンクはバーチャルオフィスを嫌がる傾向がある（審査が通りにくい）",
                    "許認可が必要な業種（人材紹介業・建設業・宅建業等）はバーチャルオフィスでは許可が下りない場合がある",
                    "バーチャルオフィス業者が廃業した場合は本店移転登記が必要（費用3万円程度）",
                  ]
                },
                {
                  subtitle: "自宅を本店にする場合",
                  content: [
                    "賃貸の場合は賃貸借契約書で「法人登記の禁止」条項がないか確認する",
                    "禁止条項がある場合は大家・管理会社に交渉するか、バーチャルオフィスを使う",
                    "自宅の一部を事業に使うと「家賃の一部を経費にできる」メリットがある（按分計算）",
                  ]
                },
                {
                  subtitle: "GMOあおぞらおすすめの理由",
                  content: [
                    "スタートアップ向けで設立直後・バーチャルオフィスでも法人口座を開設できる",
                    "振込手数料が業界最安クラス（GMO系サービスとの振込は無料）",
                    "API連携でfreee・マネーフォワードと自動同期できる",
                  ]
                },
              ],
              caution: "許認可が必要な業種（医療機器製造販売・人材紹介・宅建等）はバーチャルオフィスで許可が取れない場合があります。事前に確認してください。",
            },
            {
              id: "cofounder",
              title: "共同創業（複数の発起人）の場合",
              badge: "株式設計が重要",
              badgeColor: "bg-rose-100 text-rose-700",
              icon: "🤝",
              summary: "複数人で会社を作る場合、株式の割り当てと株主間契約が後のトラブル防止に非常に重要です。",
              items: [
                {
                  subtitle: "株式割合の設計",
                  content: [
                    "代表者が過半数（51%以上）を持つことを推奨。2/3以上（67%）あると普通決議・特別決議ともに単独で可決できる",
                    "均等割り（例：3人で33%ずつ）は経営判断が膠着するリスクがある",
                    "将来VCからの出資・希薄化を考慮した割り当てが重要",
                    "创業者全員の出資額・役割・株式割合を明確にしておく",
                  ]
                },
                {
                  subtitle: "株主間契約（SHA）の締結",
                  content: [
                    "設立と同時に創業者間で「株主間契約（SHA）」を締結することを強く推奨",
                    "記載すべき内容：役員からの退任時の株式買戻し条項（Vesting）、優先引受権、譲渡制限、デッドロック解消条項",
                    "特にVesting（株式の時間経過による権利確定）は創業者離脱時のトラブル防止に重要",
                    "弁護士に依頼して作成することを推奨（費用：10〜30万円程度）",
                  ],
                  action: { label: "契約書テンプレートで SHA を確認・作成する", to: "/contracts" },
                },
                {
                  subtitle: "発起人の手続き",
                  content: [
                    "発起人全員の「印鑑証明書」（発行後3ヶ月以内）が必要",
                    "発起人の一人が海外在住の場合：在外公館（日本大使館等）でのサイン証明書が必要（場合によって数週間かかる）",
                    "発起人の法人化も可能だが、定款認証・書類が複雑になる",
                  ]
                },
              ],
              caution: "株式割合と株主間契約は設立後の変更が困難です。創業時に十分な議論と専門家のレビューを受けることを強くお勧めします。",
            },
          ].map((caseItem) => {
            const isOpen = expandedQ === caseItem.id;
            return (
              <div key={caseItem.id} className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
                <button
                  onClick={() => setExpandedQ(isOpen ? null : caseItem.id)}
                  className="flex w-full items-start gap-4 p-5 text-left hover:bg-slate-50/50"
                >
                  <span className="text-2xl">{caseItem.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{caseItem.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${caseItem.badgeColor}`}>{caseItem.badge}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{caseItem.summary}</p>
                  </div>
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-slate-100 px-5 pb-6 pt-4">
                    {caseItem.items.map((section) => (
                      <div key={section.subtitle} className="rounded-xl bg-slate-50 p-4">
                        <h4 className="mb-2 text-xs font-bold text-slate-700">{section.subtitle}</h4>
                        <ul className="space-y-1.5">
                          {section.content.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                              {c}
                            </li>
                          ))}
                        </ul>
                        {"action" in section && section.action && (
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <Link
                              to={(section.action as { label: string; to: string }).to}
                              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary-700"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                              {(section.action as { label: string; to: string }).label}
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                      <p className="mb-1 text-xs font-bold text-red-700">⚠ 注意事項</p>
                      <p className="text-xs text-red-700">{caseItem.caution}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-500">
            ※ 本ページの情報は一般的な参考情報です。個別の状況によって対応が異なります。重要な判断は必ず税理士・司法書士・弁護士にご相談ください。
          </div>
        </div>
      )}
    </div>
  );
}
