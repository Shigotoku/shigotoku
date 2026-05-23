import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Banknote, Calendar, ExternalLink, CheckCircle2,
  AlertCircle, FileText, Star, Clock, Bot, Copy,
} from "lucide-react";
import { useCompanyStore } from "../../../store/company";

interface SubsidyDetail {
  name: string;
  organization: string;
  maxAmount: string;
  rate: string;
  deadline: string;
  category: string;
  match: number;
  overview: string;
  eligibility: string[];
  expenses: string[];
  process: { step: string; detail: string }[];
  documents: string[];
  links: { label: string; url: string }[];
  tips: string[];
}

const subsidyDetails: Record<string, SubsidyDetail> = {
  "sub-1": {
    name: "小規模事業者持続化補助金",
    organization: "日本商工会議所",
    maxAmount: "最大250万円",
    rate: "2/3",
    deadline: "2026-05-31",
    category: "販路開拓",
    match: 95,
    overview: "小規模事業者（製造業20名以下・商業サービス業5名以下）が取り組む販路開拓や業務効率化の取り組みを支援する補助金です。創業枠では創業3年以内の事業者を優遇し、上限額が引き上げられます。スタートアップの初期マーケティング投資に活用できます。",
    eligibility: [
      "小規模事業者であること（製造業20名以下、商業・サービス業5名以下）",
      "商工会・商工会議所の管轄地域内で事業を営んでいること",
      "創業枠は特定創業支援事業による支援を受けた者",
      "持続化給付金・休業等支援金の不正受給がないこと",
    ],
    expenses: [
      "機械装置等費", "広報費（Web広告・チラシ・HP制作等）",
      "ウェブサイト関連費（補助金上限の1/4まで）", "展示会等出展費",
      "旅費", "開発費", "委託・外注費",
    ],
    process: [
      { step: "経営計画書・補助事業計画書の作成", detail: "事業内容と販路開拓計画を具体的に記載" },
      { step: "商工会・商工会議所への相談・確認", detail: "事業支援計画書（様式4）の発行を依頼" },
      { step: "電子申請（jGrants）", detail: "GBizIDプライムアカウントが必要" },
      { step: "審査・採択発表", detail: "申請から約2〜3ヶ月後" },
      { step: "補助事業の実施", detail: "交付決定後に事業を開始（遡及不可）" },
      { step: "実績報告・確定検査", detail: "証拠書類を整理して提出" },
      { step: "補助金の請求・受領", detail: "確定通知後に請求・振込" },
    ],
    documents: [
      "経営計画書兼補助事業計画書（様式2）",
      "事業支援計画書（様式4：商工会議所発行）",
      "決算書（直近1〜2期分）",
      "確定申告書（個人事業主の場合）",
      "GBizIDプライムアカウント",
    ],
    links: [
      { label: "公式サイト", url: "https://www.jizokukahojokin.info/" },
      { label: "jGrants（電子申請）", url: "https://www.jgrants-portal.go.jp/" },
    ],
    tips: [
      "創業枠・事業継承枠等の特別枠を活用すると採択率が上がる傾向",
      "経営計画書には具体的な数値目標（売上増加率・新規顧客数等）を記載",
      "商工会議所への相談は締切3〜4週間前には行うこと",
      "HP制作費は補助金上限の1/4まで（他の経費と組み合わせが有効）",
    ],
  },
  "sub-2": {
    name: "IT導入補助金（通常枠）",
    organization: "独立行政法人中小企業基盤整備機構",
    maxAmount: "最大450万円",
    rate: "1/2〜3/4",
    deadline: "2026-05-31",
    category: "IT化",
    match: 88,
    overview: "中小企業・小規模事業者が自社の課題やニーズに合ったITツール（ソフトウェア・サービス等）を導入する際の費用を補助します。会計・労務・販売管理・CRM等の業務効率化ツールのほか、ECサイト構築費用も対象になります。",
    eligibility: [
      "中小企業・小規模事業者（資本金・従業員数による）",
      "IT導入支援事業者が登録するITツールを導入すること",
      "gBizIDプライムアカウントを取得済であること",
      "SECURITY ACTIONで二つ星宣言済であること",
    ],
    expenses: [
      "ソフトウェア購入費", "クラウドサービス利用費",
      "導入関連費（設定・教育訓練費）", "ハードウェア購入費（セキュリティ対策型のみ）",
    ],
    process: [
      { step: "gBizIDプライム・SECURITY ACTION取得", detail: "申請前に必ず取得" },
      { step: "IT導入支援事業者・ツールの選定", detail: "登録されたツールのみ対象" },
      { step: "IT導入支援事業者との共同申請", detail: "事業者が主体的に申請手続きを進める" },
      { step: "審査・交付決定", detail: "申請から約1〜2ヶ月" },
      { step: "ITツールの導入・支払い", detail: "交付決定後に導入・支払い（事前支払い不可）" },
      { step: "実績報告・補助金受領", detail: "システム上で報告" },
    ],
    documents: [
      "gBizIDプライムアカウント",
      "SECURITY ACTION（二つ星）の宣言証明",
      "決算書（直近2期分）",
      "法人の場合：法人税確定申告書",
    ],
    links: [
      { label: "IT導入補助金公式", url: "https://www.it-hojo.jp/" },
      { label: "gBizID取得", url: "https://gbiz-id.go.jp/" },
    ],
    tips: [
      "まずIT導入支援事業者（ベンダー）に相談すると申請がスムーズ",
      "会計ソフト・勤怠管理・CRMなどスタートアップに必要なツールが対象",
      "複数のITツールをまとめて申請すると補助金額が増える",
      "インボイス対応ツールの導入は補助率が高い特別枠を活用",
    ],
  },
  "sub-3": {
    name: "ものづくり補助金（成長型中小企業等研究開発支援型）",
    organization: "全国中小企業団体中央会",
    maxAmount: "最大5,000万円",
    rate: "1/2〜2/3",
    deadline: "2026-02-28",
    category: "研究開発",
    match: 72,
    overview: "革新的な製品・サービスの開発や生産プロセスの改善に必要な設備投資等を支援する補助金です。ものづくり・商業・サービスの高付加価値化に向けた設備投資（機械・装置等）や試作品開発費が対象となります。医療機器・ヘルスケアデバイス開発にも活用できます。",
    eligibility: [
      "中小企業・小規模事業者であること（資本金・従業員数要件あり）",
      "3〜5年の事業計画を策定していること",
      "付加価値額：年率平均3%以上増加の計画",
      "給与支給総額：年率平均1.5%以上増加の計画",
    ],
    expenses: [
      "機械装置・システム構築費（最重要）",
      "技術導入費・専門家経費",
      "運搬費・クラウドサービス利用費",
      "原材料費・外注費・知的財産権等関連経費",
    ],
    process: [
      { step: "事業計画書の作成", detail: "革新的な取り組みの説明が審査の核心" },
      { step: "電子申請（GビズID）", detail: "採択率向上のため認定支援機関のサポートを推奨" },
      { step: "審査・採択発表", detail: "年に複数回の公募" },
      { step: "設備投資の実施", detail: "交付決定後に発注・購入（前払い不可）" },
      { step: "実績報告・確定", detail: "購入証憑・写真等の証拠書類を提出" },
      { step: "補助金受領", detail: "事業完了から約2〜3ヶ月後" },
    ],
    documents: [
      "事業計画書（様式1）",
      "決算書（直近2期分）",
      "認定経営革新等支援機関の確認書",
      "見積書（複数社）",
      "登記簿謄本",
    ],
    links: [
      { label: "ものづくり補助事業公式", url: "https://portal.monodukuri-hojo.jp/" },
    ],
    tips: [
      "採択率向上には認定支援機関（税理士・中小企業診断士等）のサポートが有効",
      "「革新的な取り組み」の説明が採択の鍵。差別化ポイントを明確に",
      "医療機器・ヘルスケア分野は付加価値が高く採択されやすい傾向",
      "加点項目（成長枠・グリーン枠等）を積極活用",
    ],
  },
  "sub-4": {
    name: "SBIR（中小企業技術革新制度）推進補助金",
    organization: "経済産業省・各省庁",
    maxAmount: "最大3,000万円〜1億円",
    rate: "2/3〜全額",
    deadline: "随時",
    category: "技術開発",
    match: 65,
    overview: "政府調達需要等を活用した中小企業・スタートアップの技術開発を支援する制度です。各省庁（経産省・農林水産省・文科省等）の課題に応じた研究開発を実施し、政府調達につながる可能性があります。フェーズ1（FS）→フェーズ2（技術開発）→フェーズ3（事業化）の段階的支援が特徴です。",
    eligibility: [
      "中小企業者または個人事業主",
      "提示された研究開発課題に応募できること",
      "技術開発のポテンシャルを有すること",
      "過去のSBIR採択実績があれば加点",
    ],
    expenses: [
      "人件費（研究者・技術者等）",
      "物品費（試験機器・消耗品等）",
      "外注費（試験・分析等）",
      "旅費・その他直接経費",
    ],
    process: [
      { step: "公募課題の確認", detail: "各省庁・支援機関のWebサイトで課題を確認" },
      { step: "提案書の作成", detail: "技術の新規性・事業化計画を詳細に記載" },
      { step: "審査・採択", detail: "書面審査 + 場合によりプレゼン審査" },
      { step: "契約締結・研究開発実施", detail: "マイルストーン管理が重要" },
      { step: "中間・最終報告", detail: "定期的な進捗報告が必要" },
      { step: "事業化フェーズへ移行", detail: "採択実績が次フェーズへの優位性になる" },
    ],
    documents: [
      "研究開発提案書",
      "法人・事業概要書",
      "研究者のプロフィール・業績",
      "財務諸表（直近2期）",
    ],
    links: [
      { label: "SBIR制度概要（経産省）", url: "https://www.meti.go.jp/policy/innovation_corp/sbir.html" },
      { label: "Jスタートアップ", url: "https://j-startup.go.jp/" },
    ],
    tips: [
      "研究開発と事業化の両立を評価するため、ビジネスモデルも明確に",
      "医療・ヘルスケア分野は厚生労働省・文科省のSBIR課題に注目",
      "採択後の成果報告・知財管理が次フェーズへの鍵",
      "アカデミア（大学・研究機関）との連携が採択率を高める",
    ],
  },
  "sub-5": {
    name: "東京都創業助成事業",
    organization: "東京都中小企業振興公社",
    maxAmount: "最大300万円",
    rate: "2/3",
    deadline: "随時（年2〜4回）",
    category: "創業支援",
    match: 82,
    overview: "東京都内での創業を予定している方または創業後5年未満の中小企業者を対象に、創業初期の費用を助成します。事務所賃借料・広告宣伝費・設備費等に幅広く活用でき、スタートアップの立上げコスト削減に有効です。各自治体にも同様の制度があります。",
    eligibility: [
      "東京都内で創業予定または創業5年未満であること",
      "東京都が実施する創業支援事業等を受講済または受講予定",
      "Aコース: 認定特定創業支援事業・ENEOSプラン等受講済",
      "Bコース: 東京都中小企業振興公社の創業支援を利用中",
    ],
    expenses: [
      "賃借料（事務所・店舗の家賃等）",
      "広告宣伝費・PR費",
      "設備費・備品費",
      "人件費（雇用した従業員の賃金）",
      "専門家指導費",
    ],
    process: [
      { step: "創業支援事業の受講", detail: "対象の支援機関で所定のコースを受講" },
      { step: "事業計画書の作成", detail: "売上予測・事業の差別化ポイントを明確に" },
      { step: "公社への申請", detail: "公式サイトから申請書類を取得" },
      { step: "書面審査・面接", detail: "事業可能性・計画の実現性を審査" },
      { step: "採択・交付決定", detail: "採択率は例年20〜30%程度" },
      { step: "事業実施・経費精算", detail: "領収書等を保存。原則後払い" },
    ],
    documents: [
      "助成金交付申請書",
      "創業計画書（事業計画）",
      "創業支援事業受講証明書",
      "法人登記簿謄本または開業届",
      "確定申告書または法人税申告書",
    ],
    links: [
      { label: "東京都創業助成事業", url: "https://www.tokyo-kosha.or.jp/support/josei/jigyo/sogyo.html" },
    ],
    tips: [
      "創業前から計画的に支援機関のコースを受講しておくと申請しやすい",
      "採択後に対象経費を支払う（原則後払い・遡及不可）",
      "事業計画書の市場分析・競合優位性が採択の鍵",
      "東京以外の方は各都道府県の同様の制度を確認",
    ],
  },
  "sub-6": {
    name: "科学技術振興機構（JST）START",
    organization: "国立研究開発法人科学技術振興機構",
    maxAmount: "最大1億円（フェーズ2）",
    rate: "全額（委託研究）",
    deadline: "年1〜2回",
    category: "研究開発",
    match: 60,
    overview: "大学・研究機関の研究成果をもとにした起業（大学発スタートアップ）を支援するプログラムです。技術の実用化・事業化の可能性を検証するためのフィージビリティスタディから、プロトタイプ開発・PoC実施まで幅広く支援します。医療・ヘルスケア・バイオ分野の大学発スタートアップに特に有効です。",
    eligibility: [
      "大学・高専・国立研究開発法人の研究成果を活用する起業家・起業準備者",
      "大学等知財推進担当部署が支援すること",
      "研究者が起業家候補として参画すること（または起業家との連携）",
      "技術の新規性・独自性が高いこと",
    ],
    expenses: [
      "研究者の人件費・謝金",
      "試験・プロトタイプ開発費",
      "外注費（試験・分析等）",
      "旅費・資料収集費",
    ],
    process: [
      { step: "大学等の知財・産学連携部署への相談", detail: "JSTとの窓口になる担当者を確認" },
      { step: "技術シーズの整理・事業化構想の作成", detail: "フェーズ1（FS）の申請準備" },
      { step: "JSTへの申請・審査", detail: "書面審査＋面接審査" },
      { step: "フェーズ1（FS）実施", detail: "最大500万円で技術実現可能性を検証" },
      { step: "フェーズ2申請・審査", detail: "フェーズ1の成果を踏まえた大型申請" },
      { step: "フェーズ2（技術開発・PoC）実施", detail: "最大1億円規模での本格開発" },
    ],
    documents: [
      "技術シーズの概要資料",
      "事業化構想書",
      "研究者のプロフィール・業績",
      "大学等の推薦書",
      "知財の権利状況確認書",
    ],
    links: [
      { label: "JST START プログラム", url: "https://www.jst.go.jp/start/" },
      { label: "大学発スタートアップ支援", url: "https://www.jst.go.jp/innovation/index.html" },
    ],
    tips: [
      "大学等の産学連携部署との早期連携が採択の近道",
      "医療・バイオ分野は特に採択率が高い傾向（社会実装ニーズが明確）",
      "フェーズ1で精度の高い市場検証を行うことでフェーズ2採択率が上がる",
      "JST以外にもNEDO、AMEDの支援プログラムを並行検討",
    ],
  },
};

const defaultDetail: SubsidyDetail = {
  name: "補助金詳細",
  organization: "実施団体",
  maxAmount: "詳細ページで確認",
  rate: "-",
  deadline: "-",
  category: "-",
  match: 0,
  overview: "この補助金の詳細情報は準備中です。",
  eligibility: ["詳細は公募要領をご確認ください"],
  expenses: [],
  process: [],
  documents: [],
  links: [],
  tips: [],
};

export default function FundingDetailPage() {
  const { id } = useParams();
  const detail = subsidyDetails[id || ""] || defaultDetail;
  const { company } = useCompanyStore();
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const generatePrompt = () => {
    const lines = [
      `# ${detail.name} の申請書類作成を手伝ってください`,
      "",
      `## 補助金情報`,
      `- 名称: ${detail.name}`,
      `- 実施機関: ${detail.organization}`,
      `- 補助上限: ${detail.maxAmount}（補助率: ${detail.rate}）`,
      `- カテゴリ: ${detail.category}`,
      `- 概要: ${detail.overview}`,
      "",
    ];
    if (company) {
      lines.push("## 当社情報");
      lines.push(`- 会社名: ${company.name}`);
      if (company.industry) lines.push(`- 業種: ${company.industry}`);
      if (company.address) lines.push(`- 所在地: ${company.address}`);
      if (company.employeeCount) lines.push(`- 従業員数: ${company.employeeCount}名`);
      if (company.capitalAmount) lines.push(`- 資本金: ${company.capitalAmount.toLocaleString()}円`);
      if (company.description) lines.push(`- 事業内容: ${company.description}`);
      lines.push("");
    }
    lines.push("## 必要書類");
    detail.documents.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
    lines.push("", "## 対象要件");
    detail.eligibility.forEach((e) => lines.push(`- ${e}`));
    lines.push("", "## お願い");
    lines.push("1. 上記の必要書類それぞれのドラフトを作成してください");
    lines.push("2. 採択率を上げるための具体的なアドバイスを含めてください");
    lines.push("3. 具体的な数値KPIの設定案を提案してください");
    lines.push("4. 審査員が重視するポイントに沿った記述にしてください");
    return lines.join("\n");
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt());
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const deadlineDate = detail.deadline !== "-" && detail.deadline !== "随時" && detail.deadline !== "年1〜2回" && detail.deadline !== "随時（年2〜4回）" && detail.deadline !== "年2〜4回"
    ? new Date(detail.deadline)
    : null;
  const isNearDeadline = deadlineDate
    ? (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 60
    : false;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link to="/funding" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{detail.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{detail.organization}</p>
        </div>
      </div>

      {isNearDeadline && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm font-semibold text-red-800">申請期限が近づいています（{detail.deadline}）。お早めに準備を始めましょう。</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: Banknote, label: "補助上限額", value: detail.maxAmount, color: "text-primary-600" },
          { icon: Star, label: "補助率", value: detail.rate, color: "text-amber-500" },
          { icon: Clock, label: "申請期限", value: detail.deadline, color: isNearDeadline ? "text-red-500" : "text-slate-900" },
          { icon: Star, label: "マッチ度", value: detail.match > 0 ? `${detail.match}%` : "-", color: "text-primary-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
            <Icon className={`mb-2 h-5 w-5 ${color}`} />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-slate-900">概要</h2>
            <p className="text-sm leading-relaxed text-slate-600">{detail.overview}</p>
          </div>

          {detail.eligibility.length > 0 && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-base font-bold text-slate-900">対象要件</h2>
              <ul className="space-y-2">
                {detail.eligibility.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detail.expenses.length > 0 && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-base font-bold text-slate-900">対象経費</h2>
              <div className="flex flex-wrap gap-2">
                {detail.expenses.map(exp => (
                  <span key={exp} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">{exp}</span>
                ))}
              </div>
            </div>
          )}

          {detail.process.length > 0 && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-slate-900">申請の流れ</h2>
              <div className="space-y-3">
                {detail.process.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.step}</p>
                      <p className="text-xs text-slate-500">{p.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="sticky top-24 space-y-4">
            <Link
              to="/funding"
              state={{ tab: "docs" }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700"
            >
              <FileText className="h-4 w-4" />
              書類準備へ進む
            </Link>

            {/* AI書類作成 */}
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
              <button onClick={() => setShowPrompt(!showPrompt)} className="flex w-full items-center gap-2 text-left">
                <Bot className="h-5 w-5 text-violet-600" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-violet-900">AIで書類作成</h3>
                  <p className="text-[10px] text-violet-600">会社情報を反映したプロンプトを生成</p>
                </div>
              </button>
              {showPrompt && (
                <div className="mt-3 space-y-2">
                  <pre className="max-h-48 overflow-y-auto rounded-lg bg-white/80 p-3 text-[10px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {generatePrompt()}
                  </pre>
                  <button onClick={copyPrompt} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700">
                    <Copy className="h-3 w-3" /> {promptCopied ? "コピー済！" : "コピー"}
                  </button>
                  <div className="flex flex-wrap gap-1">
                    <a href="https://chat.openai.com/" target="_blank" rel="noopener noreferrer" className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-50">ChatGPTを開く</a>
                    <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-50">Claudeを開く</a>
                    <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-50">Geminiを開く</a>
                  </div>
                </div>
              )}
            </div>

            {detail.documents.length > 0 && (
              <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-slate-900">必要書類</h3>
                <ul className="space-y-2">
                  {detail.documents.map((doc, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.links.length > 0 && (
              <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-slate-900">参考リンク</h3>
                <div className="space-y-2">
                  {detail.links.map(link => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 transition-all hover:bg-primary-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {detail.tips.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-amber-900">採択のポイント</h3>
                <ul className="space-y-2">
                  {detail.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
