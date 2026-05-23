import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Building2, Users, Banknote, MapPin, Calendar, UserCheck,
  ChevronDown, ChevronUp, CheckCircle2, Circle,
  ExternalLink, Star, AlertCircle, Info, Lightbulb,
  ArrowRight, FileText, Bot, Copy, Save, Check,
} from "lucide-react";
import { useProgressStore, TASK_IDS } from "../../../store/progress";
import { useCompanyStore } from "../../../store/company";

interface BasicItem {
  id: string;
  title: string;
  icon: typeof Building2;
  summary: string;
  done: boolean;
}

const STORAGE_KEY = "company-basics-data";
const STORAGE_KEY_DONE = "company-basics-done";

interface CompanyBasicsData {
  companyType: string;
  companyName: string;
  businessPurposes: string;
  address: string;
  addressType: string;
  capitalAmount: string;
  fiscalYearEnd: string;
  directors: string;
  directorTerm: string;
  founders: string;
  representativeName: string;
}

const defaultData: CompanyBasicsData = {
  companyType: "",
  companyName: "",
  businessPurposes: "",
  address: "",
  addressType: "",
  capitalAmount: "",
  fiscalYearEnd: "",
  directors: "",
  directorTerm: "10",
  founders: "",
  representativeName: "",
};

export default function CompanyBasicsPage() {
  const location = useLocation();
  const [data, setData] = useState<CompanyBasicsData>(defaultData);
  const [doneItems, setDoneItems] = useState<Record<string, boolean>>({});
  const [openSection, setOpenSection] = useState<string | null>("companyType");
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [saved, setSaved] = useState(false);
  const { markDone, isDone } = useProgressStore();
  const { company, updateCompany } = useCompanyStore();

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) setData(JSON.parse(savedData));
      const savedDone = localStorage.getItem(STORAGE_KEY_DONE);
      if (savedDone) setDoneItems(JSON.parse(savedDone));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const state = location.state as { openSection?: string } | null;
    if (state?.openSection) {
      setOpenSection(state.openSection);
      setTimeout(() => {
        const el = document.getElementById(`section-${state.openSection}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [location.state]);

  const save = (updates: Partial<CompanyBasicsData>) => {
    const next = { ...data, ...updates };
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleSaveAll = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY_DONE, JSON.stringify(doneItems));

    markDone(TASK_IDS.PRE_COMPANY_TYPE);
    markDone(TASK_IDS.PRE_FOUNDERS);
    markDone(TASK_IDS.PRE_CAPITAL);
    markDone(TASK_IDS.PRE_ADDRESS);
    markDone(TASK_IDS.INC_FORM);
    markDone(TASK_IDS.INC_BASICS);

    if (company) {
      const updates: Record<string, unknown> = {};
      if (data.companyName) updates.name = data.companyName;
      if (data.address) updates.address = data.address;
      if (data.capitalAmount) updates.capitalAmount = Number(data.capitalAmount) * 10000;
      if (data.representativeName) updates.representativeName = data.representativeName;
      updateCompany(updates);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleDone = (id: string) => {
    const next = { ...doneItems, [id]: !doneItems[id] };
    setDoneItems(next);
    localStorage.setItem(STORAGE_KEY_DONE, JSON.stringify(next));
  };

  const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

  const doneCount = Object.values(doneItems).filter(Boolean).length;
  const hasAnyData = data.companyType || data.companyName || data.capitalAmount || data.address;

  const sections: BasicItem[] = [
    { id: "companyType", title: "会社形態の決定", icon: Building2, summary: "株式会社 / 合同会社 / 医療法人", done: !!doneItems["companyType"] },
    { id: "companyName", title: "商号（会社名）の決定", icon: Star, summary: "商標チェック済みの名前を使用", done: !!doneItems["companyName"] },
    { id: "founders", title: "発起人・役員の決定", icon: Users, summary: "代表取締役、取締役、監査役の選任", done: !!doneItems["founders"] },
    { id: "businessPurpose", title: "事業目的の決定", icon: FileText, summary: "定款に記載する事業内容を決定", done: !!doneItems["businessPurpose"] },
    { id: "address", title: "本店所在地の決定", icon: MapPin, summary: "自宅・バーチャルオフィス・賃貸オフィス", done: !!doneItems["address"] },
    { id: "capital", title: "資本金の決定", icon: Banknote, summary: "金額と払込方法を決定", done: !!doneItems["capital"] },
    { id: "fiscalYear", title: "事業年度の決定", icon: Calendar, summary: "決算月の決め方", done: !!doneItems["fiscalYear"] },
    { id: "directors", title: "取締役・機関設計", icon: UserCheck, summary: "取締役の人数と任期の設定", done: !!doneItems["directors"] },
  ];

  const generatePrompt = () => {
    const lines: string[] = [
      "# 会社設立の基本事項について壁打ちしてください",
      "",
      "以下の内容で会社設立を準備しています。不足している点、改善すべき点、注意すべきリスクを教えてください。",
      "",
    ];
    if (data.companyType) lines.push(`## 会社形態\n${data.companyType}`);
    if (data.companyName) lines.push(`## 商号\n${data.companyName}`);
    if (data.founders) lines.push(`## 発起人・役員\n${data.founders}`);
    if (data.representativeName) lines.push(`## 代表取締役\n${data.representativeName}`);
    if (data.businessPurposes) lines.push(`## 事業目的\n${data.businessPurposes}`);
    if (data.address) lines.push(`## 本店所在地\n${data.address}（${data.addressType || "未定"}）`);
    if (data.capitalAmount) lines.push(`## 資本金\n${data.capitalAmount}万円`);
    if (data.fiscalYearEnd) lines.push(`## 決算月\n${data.fiscalYearEnd}月`);
    if (data.directors) lines.push(`## 取締役構成\n${data.directors}`);
    if (data.directorTerm) lines.push(`## 取締役任期\n${data.directorTerm}年`);
    lines.push("", "特に以下の観点でアドバイスをお願いします：");
    lines.push("1. 法的に問題がないか");
    lines.push("2. 節税の観点で改善点はないか");
    lines.push("3. 将来の資金調達を見据えた改善点");
    lines.push("4. 定款に記載すべき追加事項");
    return lines.join("\n");
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt());
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">基本事項の決定</h1>
        <p className="mt-1 text-sm text-slate-500">
          会社設立に必要な基本事項を一つずつ決定していきましょう
        </p>
      </div>

      {/* 進捗 */}
      <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-blue-50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">決定進捗</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">
              <span className="text-primary-600">{doneCount}</span> / {sections.length} 項目完了
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-primary-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-blue-500 transition-all"
                style={{ width: `${(doneCount / sections.length) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-primary-600">
              {Math.round((doneCount / sections.length) * 100)}%
            </span>
          </div>
        </div>
        {doneCount === sections.length && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            すべての基本事項が決定しました！次は定款の作成に進みましょう
            <Link to="/incorporation" className="ml-auto inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800">
              定款作成へ <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
        {hasAnyData && (
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleSaveAll}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all ${
                saved
                  ? "bg-emerald-600 text-white"
                  : "bg-primary-600 text-white hover:bg-primary-700"
              }`}
            >
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "保存しました！" : "入力内容を保存する"}
            </button>
            <span className="text-xs text-slate-400">
              保存すると会社設立ナビにも反映されます
            </span>
          </div>
        )}
      </div>

      {/* セクション一覧 */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} id={`section-${section.id}`} className="rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all">
            {/* ヘッダー */}
            <button
              onClick={() => toggle(section.id)}
              className="flex w-full items-center gap-3 p-5 text-left"
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleDone(section.id); }}
                className="shrink-0"
              >
                {section.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300" />
                )}
              </button>
              <section.icon className="h-5 w-5 shrink-0 text-primary-500" />
              <div className="flex-1">
                <h3 className={`text-sm font-bold ${section.done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  {section.title}
                </h3>
                <p className="text-xs text-slate-500">{section.summary}</p>
              </div>
              {openSection === section.id ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {/* 詳細コンテンツ */}
            {openSection === section.id && (
              <div className="border-t border-slate-100 px-5 pb-5">
                {section.id === "companyType" && <CompanyTypeSection data={data} save={save} />}
                {section.id === "companyName" && <CompanyNameSection data={data} save={save} />}
                {section.id === "founders" && <FoundersSection data={data} save={save} />}
                {section.id === "businessPurpose" && <BusinessPurposeSection data={data} save={save} />}
                {section.id === "address" && <AddressSection data={data} save={save} />}
                {section.id === "capital" && <CapitalSection data={data} save={save} />}
                {section.id === "fiscalYear" && <FiscalYearSection data={data} save={save} />}
                {section.id === "directors" && <DirectorsSection data={data} save={save} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AIで壁打ち */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="flex w-full items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <Bot className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">AIで壁打ちする</h3>
            <p className="text-xs text-slate-500">入力内容をもとにAIへの相談プロンプトを自動生成します</p>
          </div>
          {showPrompt ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {showPrompt && (
          <div className="mt-4 space-y-3">
            <pre className="max-h-64 overflow-y-auto rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
              {generatePrompt()}
            </pre>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copyPrompt}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                <Copy className="h-3.5 w-3.5" />
                {promptCopied ? "コピーしました！" : "プロンプトをコピー"}
              </button>
              <a href="https://chat.openai.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <ExternalLink className="h-3 w-3" /> ChatGPTを開く
              </a>
              <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <ExternalLink className="h-3 w-3" /> Claudeを開く
              </a>
              <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <ExternalLink className="h-3 w-3" /> Geminiを開く
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 次のステップへ */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h3 className="text-sm font-bold text-emerald-800">基本事項が決まったら</h3>
        <p className="mt-1 text-xs text-emerald-600">
          次は定款の作成に進みます。会社設立ナビで定款作成から登記までの全ステップをガイドします。
        </p>
        <Link
          to="/incorporation"
          state={{ fromJourney: true }}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          会社設立ナビへ進む <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* ================================================================
   各セクションのコンポーネント
   ================================================================ */

function SectionProps({ data, save }: { data: CompanyBasicsData; save: (u: Partial<CompanyBasicsData>) => void }) {
  return null;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div>{children}</div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
      <div>{children}</div>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <div>{children}</div>
    </div>
  );
}

// ----- 会社形態 -----
function CompanyTypeSection({ data, save }: { data: CompanyBasicsData; save: (u: Partial<CompanyBasicsData>) => void }) {
  const types = [
    {
      value: "株式会社",
      pros: ["社会的信用が高い", "株式発行で資金調達が容易", "上場が可能"],
      cons: ["設立費用が高い（約25万円〜）", "定款の公証人認証が必要", "役員任期あり"],
      cost: "約25万円〜",
      best: "資金調達やIPOを目指す場合",
    },
    {
      value: "合同会社",
      pros: ["設立費用が安い（約10万円〜）", "経営の自由度が高い", "定款認証不要"],
      cons: ["社会的信用がやや低い", "株式発行による資金調達不可", "上場不可"],
      cost: "約10万円〜",
      best: "少人数でスモールスタートする場合",
    },
    {
      value: "医療法人",
      pros: ["医療機関の運営に必須", "税制上の優遇あり", "事業承継がしやすい"],
      cons: ["設立手続きが複雑", "都道府県知事の認可が必要", "剰余金の配当不可"],
      cost: "数十万円〜",
      best: "病院・クリニックを運営する場合",
    },
  ];

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => save({ companyType: t.value })}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              data.companyType === t.value
                ? "border-primary-500 bg-primary-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <h4 className="text-sm font-bold text-slate-900">{t.value}</h4>
            <p className="mt-1 text-[11px] text-slate-500">設立費用: {t.cost}</p>
            <div className="mt-2 space-y-1">
              {t.pros.map((p) => (
                <p key={p} className="text-[11px] text-emerald-600">✓ {p}</p>
              ))}
              {t.cons.map((c) => (
                <p key={c} className="text-[11px] text-red-500">✗ {c}</p>
              ))}
            </div>
            <p className="mt-2 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
              おすすめ：{t.best}
            </p>
          </button>
        ))}
      </div>
      <Tip>
        資金調達（VC・エンジェル投資家）を予定している場合は<strong>株式会社</strong>を選択してください。
        合同会社から株式会社への組織変更は可能ですが、手間と費用がかかります。
      </Tip>
    </div>
  );
}

// ----- 商号 -----
function CompanyNameSection({ data, save }: { data: CompanyBasicsData; save: (u: Partial<CompanyBasicsData>) => void }) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">商号（会社名）</label>
        <input
          type="text"
          value={data.companyName}
          onChange={(e) => save({ companyName: e.target.value })}
          placeholder="例：株式会社スタートアップビルダー"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>
      <InfoBox>
        <p className="font-semibold mb-1">商号に使用できる文字</p>
        <p>漢字、ひらがな、カタカナ、ローマ字（大文字・小文字）、アラビア数字、一部の記号（「&」「'」「,」「-」「.」「・」）が使用できます。</p>
        <a
          href="https://www.moj.go.jp/MINJI/minji44.html"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
        >
          法務局：商号の使用可能文字 <ExternalLink className="h-3 w-3" />
        </a>
      </InfoBox>
      <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
        <p className="text-sm font-bold text-primary-800 mb-2">ネーミングツールで確認しましょう</p>
        <p className="text-xs text-primary-600 mb-3">
          商標が既に登録されていないか、希望のドメインが取得できるかを確認できます。
          商標トラブルを防ぐために、必ず確認することをお勧めします。
        </p>
        <Link
          to="/naming"
          state={{ fromJourney: true }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Star className="h-4 w-4" />
          ネーミングツールを開く
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <Tip>
        同じ住所に同じ商号の会社は登記できません。
        <a
          href="https://www.houjin-bangou.nta.go.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 font-medium text-amber-700 underline"
        >
          国税庁法人番号公表サイト
        </a>
        で同名会社がないか確認しましょう。
      </Tip>
    </div>
  );
}

// ----- 発起人・役員 -----
function FoundersSection({ data, save }: { data: CompanyBasicsData; save: (u: Partial<CompanyBasicsData>) => void }) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">代表取締役</label>
        <input
          type="text"
          value={data.representativeName}
          onChange={(e) => save({ representativeName: e.target.value })}
          placeholder="例：山田太郎"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">発起人・役員構成</label>
        <textarea
          value={data.founders}
          onChange={(e) => save({ founders: e.target.value })}
          rows={4}
          placeholder={"例：\n発起人兼代表取締役：山田太郎（出資100万円）\n取締役：佐藤花子\n監査役：なし"}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>
      <InfoBox>
        <p className="font-semibold mb-1">役員の種類</p>
        <ul className="space-y-1">
          <li><strong>代表取締役</strong>：会社の代表権を持つ。株式会社は最低1名必要</li>
          <li><strong>取締役</strong>：経営の意思決定を行う。非公開会社は1名でOK</li>
          <li><strong>監査役</strong>：取締役の業務を監査。非公開会社では設置は任意</li>
        </ul>
      </InfoBox>
      <Warning>
        共同創業者がいる場合、必ず<strong>株主間契約（SHA）</strong>を締結してください。
        後のトラブル防止に不可欠です。
        <Link to="/contracts" className="ml-1 font-medium text-red-600 underline">
          契約書テンプレートで作成 →
        </Link>
      </Warning>
      <Tip>
        1人で設立する場合、発起人＝代表取締役＝株主の1人3役が一般的です。
        取締役会を設置しない場合（非公開会社）、取締役は1名で設立できます。
      </Tip>
    </div>
  );
}

// ----- 事業目的 -----
function BusinessPurposeSection({ data, save }: { data: CompanyBasicsData; save: (u: Partial<CompanyBasicsData>) => void }) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">事業目的（1行に1項目）</label>
        <textarea
          value={data.businessPurposes}
          onChange={(e) => save({ businessPurposes: e.target.value })}
          rows={8}
          placeholder={"例：\n1. コンピュータソフトウェアの開発、販売及び保守\n2. インターネットを利用した各種情報提供サービス\n3. 経営コンサルティング業務\n4. 上記各号に附帯関連する一切の事業"}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>
      <Tip>
        <p className="font-semibold mb-1">事業目的の書き方のコツ</p>
        <ul className="space-y-1">
          <li>・<strong>5〜10項目</strong>が標準。多すぎると信用に影響する場合も</li>
          <li>・将来行う可能性のある事業も含めておく（後で変更は登録免許税3万円かかる）</li>
          <li>・最後に必ず<strong>「上記各号に附帯関連する一切の事業」</strong>を入れる</li>
          <li>・許認可が必要な事業は、法令に沿った表現で記載する</li>
        </ul>
      </Tip>
      <InfoBox>
        事業目的の書き方に迷ったら、同業他社の定款を参考にしましょう。
        <a
          href="https://www.houjin-bangou.nta.go.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
        >
          法人番号公表サイト <ExternalLink className="h-3 w-3" />
        </a>
        で類似企業を検索し、登記情報を確認できます。
      </InfoBox>
    </div>
  );
}

// ----- 本店所在地 -----
function AddressSection({ data, save }: { data: CompanyBasicsData; save: (u: Partial<CompanyBasicsData>) => void }) {
  const addressTypes = [
    { value: "自宅", label: "自宅", desc: "初期費用を抑えたい場合。一部の賃貸マンションは不可" },
    { value: "バーチャルオフィス", label: "バーチャルオフィス", desc: "月額数千円〜。銀行口座開設不可の場合あり" },
    { value: "レンタルオフィス", label: "レンタルオフィス", desc: "月額数万円〜。信用度が高く、銀行口座開設に有利" },
    { value: "賃貸オフィス", label: "賃貸オフィス", desc: "固定費は高いが、信用度は最も高い" },
  ];

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {addressTypes.map((t) => (
          <button
            key={t.value}
            onClick={() => save({ addressType: t.value })}
            className={`rounded-xl border-2 p-3 text-left transition-all ${
              data.addressType === t.value
                ? "border-primary-500 bg-primary-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <h4 className="text-sm font-bold text-slate-900">{t.label}</h4>
            <p className="text-[11px] text-slate-500">{t.desc}</p>
          </button>
        ))}
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">住所</label>
        <input
          type="text"
          value={data.address}
          onChange={(e) => save({ address: e.target.value })}
          placeholder="例：東京都渋谷区〇〇 1-2-3 〇〇ビル5階"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>
      <Warning>
        <strong>バーチャルオフィス</strong>を利用する場合、一部の銀行（メガバンク等）では法人口座開設が難しい場合があります。
        事前に希望の銀行の審査基準を確認しましょう。
      </Warning>
      <Tip>
        本店所在地を登記する際、ビル名・部屋番号まで登記すると移転のたびに変更登記（3万円）が必要です。
        「東京都渋谷区〇〇 1-2-3」のように、最小行政区画までにとどめる方法もあります。
      </Tip>
    </div>
  );
}

// ----- 資本金 -----
function CapitalSection({ data, save }: { data: CompanyBasicsData; save: (u: Partial<CompanyBasicsData>) => void }) {
  const capitalOptions = [
    { value: "100", label: "100万円", desc: "最低限のスタート。信用面でやや不利" },
    { value: "300", label: "300万円", desc: "一般的なスタートライン。多くの取引で問題なし" },
    { value: "500", label: "500万円", desc: "銀行口座開設や取引先との信用構築に有利" },
    { value: "999", label: "999万円", desc: "消費税免税（1,000万円未満）の最大金額" },
  ];

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {capitalOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => save({ capitalAmount: opt.value })}
            className={`rounded-xl border-2 p-3 text-left transition-all ${
              data.capitalAmount === opt.value
                ? "border-primary-500 bg-primary-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <h4 className="text-sm font-bold text-slate-900">{opt.label}</h4>
            <p className="text-[11px] text-slate-500">{opt.desc}</p>
          </button>
        ))}
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">資本金（万円）</label>
        <input
          type="text"
          value={data.capitalAmount}
          onChange={(e) => save({ capitalAmount: e.target.value })}
          placeholder="例：300"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>
      <InfoBox>
        <p className="font-semibold mb-1">資本金の重要ポイント</p>
        <ul className="space-y-1">
          <li>・法律上は<strong>1円</strong>から設立可能だが、現実的には100〜500万円が標準</li>
          <li>・<strong>1,000万円未満</strong>なら設立初年度の消費税が免税</li>
          <li>・許認可が必要な業種では<strong>最低資本金の要件</strong>がある場合あり</li>
          <li>・銀行口座開設の審査では資本金額も見られる</li>
        </ul>
      </InfoBox>
      <Warning>
        資本金が少なすぎると取引先や銀行の信用審査で不利になります。
        最低でも<strong>100万円</strong>以上を推奨します。
      </Warning>
    </div>
  );
}

// ----- 事業年度 -----
function FiscalYearSection({ data, save }: { data: CompanyBasicsData; save: (u: Partial<CompanyBasicsData>) => void }) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-2">決算月</label>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => save({ fiscalYearEnd: String(m) })}
              className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                data.fiscalYearEnd === String(m)
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {m}月
            </button>
          ))}
        </div>
      </div>
      <Tip>
        <p className="font-semibold mb-1">決算月の決め方</p>
        <ul className="space-y-1">
          <li>・設立月から<strong>最も遠い月</strong>に設定すると、1期目の事業年度が最長になり節税上有利</li>
          <li>・例：4月設立 → 決算月を<strong>3月</strong>に設定すると1期目が最長（約12ヶ月）</li>
          <li>・繁忙期を避けると決算処理が楽になる</li>
          <li>・消費税免税期間を最大化するなら、設立月の前月を決算月にする</li>
        </ul>
      </Tip>
      <InfoBox>
        日本では3月決算が多いですが、スタートアップでは設立時期に合わせて柔軟に設定するのが一般的です。
        決算月は定款に記載し、後から変更することも可能です（株主総会決議が必要）。
      </InfoBox>
    </div>
  );
}

// ----- 取締役・機関設計 -----
function DirectorsSection({ data, save }: { data: CompanyBasicsData; save: (u: Partial<CompanyBasicsData>) => void }) {
  const termOptions = ["2", "4", "6", "10"];

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">取締役の構成</label>
        <textarea
          value={data.directors}
          onChange={(e) => save({ directors: e.target.value })}
          rows={3}
          placeholder={"例：\n代表取締役：山田太郎\n取締役：なし（1名体制）"}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-2">取締役の任期</label>
        <div className="flex flex-wrap gap-2">
          {termOptions.map((t) => (
            <button
              key={t}
              onClick={() => save({ directorTerm: t })}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                data.directorTerm === t
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {t}年
            </button>
          ))}
        </div>
      </div>
      <InfoBox>
        <p className="font-semibold mb-1">機関設計のポイント</p>
        <ul className="space-y-1">
          <li>・<strong>非公開会社</strong>（株式譲渡制限あり）なら取締役は最低<strong>1名</strong>でOK</li>
          <li>・取締役会は<strong>取締役3名以上 + 監査役1名以上</strong>が必要</li>
          <li>・スタートアップの初期は取締役会非設置がシンプルでおすすめ</li>
          <li>・VCから出資を受ける場合、取締役会の設置を求められることが多い</li>
        </ul>
      </InfoBox>
      <Tip>
        非公開会社の場合、任期は最長<strong>10年</strong>まで延長可能です。
        任期を10年にすると、再任登記の手間と費用（登録免許税1万円）を削減できます。
        ただし、共同創業の場合は短めの任期にして柔軟性を確保するのも一案です。
      </Tip>
    </div>
  );
}
