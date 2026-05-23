import { useState, useEffect } from "react";
import {
  Search,
  FolderSearch,
  Monitor,
  FileText,
  CreditCard,
  Clock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  Plus,
  Save,
  BookmarkCheck,
  AlertTriangle,
  X,
  BadgeCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

interface IpItem {
  id: string;
  name: string;
  type: "特許" | "商標" | "意匠" | "営業秘密";
  status: "検討中" | "出願準備" | "出願済" | "審査中" | "登録済" | "拒絶";
  filingDate: string;
  registrationNum: string;
  notes: string;
  dueDate: string;
}

const IP_STORAGE_KEY = "runwith-ip";

const statusColors: Record<string, string> = {
  "検討中": "bg-slate-100 text-slate-600 border-slate-200",
  "出願準備": "bg-blue-50 text-blue-700 border-blue-200",
  "出願済": "bg-violet-50 text-violet-700 border-violet-200",
  "審査中": "bg-amber-50 text-amber-700 border-amber-200",
  "登録済": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "拒絶": "bg-red-50 text-red-600 border-red-200",
};

interface Step {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  duration: string;
  learnContent: string[];
  tips: string[];
  actions: { label: string; url?: string; internal?: string }[];
}

const steps: Step[] = [
  {
    id: 1,
    title: "ネーミングと類似チェック",
    subtitle: "まずは名前の候補を決めて、似た商標がないか確認しましょう",
    icon: Search,
    duration: "所要時間: 30分〜1時間",
    learnContent: [
      "商標は「名前」と「区分（どんな商品・サービスで使うか）」のセットで登録されます。",
      "文字が完全に同じでなくても、読み方（称呼）が似ているだけで登録できないことがあります。例えば「メディトク」と「メデトク」は類似と判断される可能性があります。",
      "事前にJ-PlatPat（特許庁の無料データベース）で検索すれば、出願費用を無駄にするリスクを大幅に減らせます。",
      "ドメインやSNSアカウントの空き状況も同時にチェックすると、あとで名前を変える手間が省けます。",
    ],
    tips: [
      "「一般名詞の組み合わせ」は商標として認められにくいです（例：「医療予約」はNG）",
      "造語（2つの言葉を掛け合わせた新しい言葉）は商標登録されやすいです",
      "海外展開を考えるなら、英語でもネガティブな意味がないか確認しましょう",
    ],
    actions: [
      { label: "ネーミング生成ツールを使う", internal: "/naming/generate" },
      {
        label: "J-PlatPatで検索する",
        url: "https://www.j-platpat.inpit.go.jp/",
      },
    ],
  },
  {
    id: 2,
    title: "区分（ジャンル）の決定",
    subtitle:
      "商品やサービスの分野を選びます。ここが一番つまづきやすいポイントです",
    icon: FolderSearch,
    duration: "所要時間: 15〜30分",
    learnContent: [
      "商標登録は全45区分（商品34区分＋サービス11区分）に分かれています。",
      "同じ名前でも区分が違えば、別の人が登録できます（例：Appleのパソコンと、Appleという車検屋）。",
      "IT・SaaSサービスの場合、よく使われるのは第9類（ソフトウェア）と第42類（SaaS・クラウド）です。",
      "区分を増やすほど費用は上がりますが、保護範囲は広がります。スタートアップはまず核心の1〜2区分から始めるのが現実的です。",
    ],
    tips: [
      "「特許庁の類似商品・役務審査基準」で正式な区分表を確認できます",
      "迷ったら第9類（ソフトウェア）と第42類（SaaS提供）をセットで取ると安全です",
      "将来の事業拡大を見据え、少し広めに取るのも戦略の一つです",
    ],
    actions: [
      { label: "区分選択ナビを使う", internal: "/naming/category" },
      {
        label: "特許庁の類似商品・役務審査基準",
        url: "https://www.jpo.go.jp/system/laws/rule/guideline/trademark/ruiji_kijun/index.html",
      },
    ],
  },
  {
    id: 3,
    title: "出願環境の準備",
    subtitle:
      "電子出願に必要なものを揃えます。紙よりも安く、自宅からでも出せます",
    icon: Monitor,
    duration: "所要時間: 1〜2時間（初回のみ）",
    learnContent: [
      "特許庁への出願は「紙」と「電子」の2通りあります。電子出願のほうが印紙代が安くなります。",
      "電子出願には「マイナンバーカード＋ICカードリーダー」または「電子証明書」が必要です。",
      "特許庁が無料で提供する「インターネット出願ソフト」をPCにインストールします。",
      "一度セットアップすれば、2件目以降は準備不要ですぐに出願できます。",
    ],
    tips: [
      "スマートフォンでマイナンバーカードを読み取れるアプリもあります",
      "Windows / Macの両方に対応しています",
      "法人の場合、法人番号を使った出願も可能です",
    ],
    actions: [
      { label: "出願準備チェックリスト", internal: "/naming/checklist" },
      {
        label: "インターネット出願ソフトをダウンロード",
        url: "https://www.pcinfo.jpo.go.jp/site/1_start/step1.html",
      },
    ],
  },
  {
    id: 4,
    title: "願書の作成・提出",
    subtitle:
      "決めた名前と区分を使って書類を作り、電子出願ソフトから送信します",
    icon: FileText,
    duration: "所要時間: 30分〜1時間",
    learnContent: [
      "願書（がんしょ）は、特許庁に「この名前をこのジャンルで使うので登録してください」と申し出る書類です。",
      "記入する内容は①商標（名前）、②指定商品・指定役務（どんなサービスで使うか）、③出願人の情報の3つだけです。",
      "電子出願ソフトのフォーマットに沿って入力し、マイナンバーカードで電子署名して送信します。",
      "出願と同時に印紙代（出願料）をクレジットカードまたはPay-easy（ペイジー）で支払います。",
    ],
    tips: [
      "出願料は1区分なら12,000円（3,400円＋8,600円×1区分）",
      "商標の書き方で悩んだら、「標準文字」で出願するのが最も簡単です",
      "書面で出願すると電子化手数料（2,400円＋800円×ページ数）が別途かかるので電子出願がお得",
    ],
    actions: [
      { label: "費用シミュレーション", internal: "/naming/cost" },
      {
        label: "出願書類の書き方ガイド（特許庁公式）",
        url: "https://www.jpo.go.jp/system/basic/trademark/index.html",
      },
    ],
  },
  {
    id: 5,
    title: "審査結果を待つ",
    subtitle: "特許庁の審査官が書類を審査します。結果が出るまで半年〜10ヶ月程度",
    icon: Clock,
    duration: "期間: 通常6〜10ヶ月 / 早期審査2〜3ヶ月",
    learnContent: [
      "出願後、特許庁の審査官が「この商標は登録してよいか」を審査します。",
      "問題なければ「登録査定」が届きます。類似商標がある場合は「拒絶理由通知」が届き、意見書で反論できます。",
      "すでにサービスを提供中（または準備が進んでいる）なら「早期審査」を申請でき、審査期間を2〜3ヶ月に短縮できます。",
      "早期審査に追加費用はかかりません（無料）。スタートアップには特におすすめです。",
    ],
    tips: [
      "早期審査の要件：すでに商標を使用している、または使用の準備をしている",
      "拒絶理由が来ても諦めない！意見書で覆せるケースは多いです",
      "審査状況はJ-PlatPatの「経過情報」で確認できます",
    ],
    actions: [
      {
        label: "早期審査の申請方法（特許庁）",
        url: "https://www.jpo.go.jp/system/trademark/shinsa/soki/index.html",
      },
    ],
  },
  {
    id: 6,
    title: "登録完了＆ブランド監視開始",
    subtitle: "登録料を納付して権利確定。取ったら終わりではなく、監視が大切です",
    icon: CreditCard,
    duration: "登録査定から30日以内に納付",
    learnContent: [
      "登録査定が届いたら、30日以内に登録料（10年一括: 32,900円/1区分、5年分割: 17,200円/1区分）を納付します。",
      "納付後、商標登録証が届き、正式に商標権が発生します。権利の有効期間は10年間（更新可能）。",
      "商標登録が完了したら、®マークをサービス名に付けることができます。",
      "第三者が類似のサービス名を使い始めた場合、差止請求や損害賠償が可能になります。ただし、自分で監視する必要があります。",
    ],
    tips: [
      "5年分割のほうが初期コストが安い（ただし10年トータルでは割高）",
      "登録したら、ウェブサイトやサービスに®マークを付けましょう",
      "類似サービスの出現を早期発見するために定期的な監視が重要です",
    ],
    actions: [
      { label: "ブランド監視ツールを使う", internal: "/naming/monitoring" },
    ],
  },
];

export default function TrademarkGuidePage() {
  const [openStep, setOpenStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [ipItems, setIpItems] = useState<IpItem[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMode, setSaveMode] = useState<"draft" | "final">("draft");
  const [saveForm, setSaveForm] = useState({
    name: "", filingDate: "", registrationNum: "", dueDate: "", notes: "", category: "",
  });

  useEffect(() => {
    try {
      const s = localStorage.getItem(IP_STORAGE_KEY);
      setIpItems(s ? JSON.parse(s) : []);
    } catch { setIpItems([]); }
  }, [showSaveModal]);

  const trademarks = ipItems.filter(i => i.type === "商標");

  const handleSave = () => {
    if (!saveForm.name.trim()) return;
    const status: IpItem["status"] = saveMode === "draft"
      ? (saveForm.filingDate ? "出願準備" : "検討中")
      : (saveForm.registrationNum ? "登録済" : saveForm.filingDate ? "出願済" : "審査中");
    const newItem: IpItem = {
      id: crypto.randomUUID(),
      name: saveForm.name,
      type: "商標",
      status,
      filingDate: saveForm.filingDate,
      registrationNum: saveForm.registrationNum,
      notes: saveForm.notes + (saveForm.category ? ` [区分: ${saveForm.category}]` : ""),
      dueDate: saveForm.dueDate,
    };
    const existing = [...ipItems, newItem];
    localStorage.setItem(IP_STORAGE_KEY, JSON.stringify(existing));
    setIpItems(existing);
    setShowSaveModal(false);
    setSaveForm({ name: "", filingDate: "", registrationNum: "", dueDate: "", notes: "", category: "" });
  };

  const toggleComplete = (stepId: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) { next.delete(stepId); } else { next.add(stepId); }
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          商標取得ステップガイド
        </h1>
        <p className="mt-2 text-slate-500">
          6つのステップをクリックしながら進めるだけ。学びながら商標を取得できます。
        </p>
      </div>

      {/* ─── 商標管理パネル ─── */}
      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-violet-600" />
            <h2 className="text-sm font-bold text-slate-900">登録中の商標</h2>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">{trademarks.length}件</span>
          </div>
          <div className="flex gap-2">
            <Link to="/ip" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50">
              知財管理を開く <ChevronRight className="h-3 w-3" />
            </Link>
            <button
              onClick={() => setShowSaveModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" /> 商標を追加
            </button>
          </div>
        </div>

        {trademarks.length === 0 ? (
          <div className="rounded-xl bg-white px-4 py-6 text-center">
            <p className="text-sm text-slate-500">まだ商標が登録されていません。</p>
            <p className="mt-1 text-xs text-slate-400">「商標を追加」ボタンで仮保存・本保存できます。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trademarks.map(tm => (
              <div key={tm.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{tm.name}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColors[tm.status]}`}>{tm.status}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-slate-500">
                    {tm.filingDate && <span>出願日: {tm.filingDate}</span>}
                    {tm.registrationNum && <span>登録番号: {tm.registrationNum}</span>}
                    {tm.dueDate && <span className="text-amber-600 font-medium">更新期限: {tm.dueDate}</span>}
                    {tm.notes && <span className="truncate max-w-xs">{tm.notes}</span>}
                  </div>
                </div>
                {tm.status === "登録済" && (
                  <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 商標保存モーダル ─── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">商標を知財管理に追加</h3>
              <button onClick={() => setShowSaveModal(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="space-y-4 p-5">
              {/* 仮保存 / 本保存 切り替え */}
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                {([["draft", "仮保存（検討中・出願準備）"], ["final", "本保存（出願済・登録済）"]] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => setSaveMode(mode)}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${saveMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">
                {saveMode === "draft"
                  ? "仮保存：商標名を検討中・出願準備段階で登録しておき、後から本保存に更新できます。"
                  : "本保存：出願済・審査中・登録済の商標を登録します。登録番号や権利満了日も入力してください。"}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">商標名 *</label>
                  <input type="text" value={saveForm.name} onChange={e => setSaveForm({...saveForm, name: e.target.value})}
                    placeholder="例: メディトク"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">区分番号（例: 第9類、第42類）</label>
                  <input type="text" value={saveForm.category} onChange={e => setSaveForm({...saveForm, category: e.target.value})}
                    placeholder="例: 第9類、第42類"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">{saveMode === "draft" ? "出願予定日" : "出願日"}</label>
                    <input type="date" value={saveForm.filingDate} onChange={e => setSaveForm({...saveForm, filingDate: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
                  </div>
                  {saveMode === "final" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">権利満了日（更新期限）</label>
                      <input type="date" value={saveForm.dueDate} onChange={e => setSaveForm({...saveForm, dueDate: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
                    </div>
                  )}
                </div>
                {saveMode === "final" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">登録番号</label>
                    <input type="text" value={saveForm.registrationNum} onChange={e => setSaveForm({...saveForm, registrationNum: e.target.value})}
                      placeholder="例: 商標登録 第1234567号"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">メモ</label>
                  <textarea value={saveForm.notes} onChange={e => setSaveForm({...saveForm, notes: e.target.value})}
                    rows={2} placeholder="備考・状況メモ"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={() => setShowSaveModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                キャンセル
              </button>
              <button onClick={handleSave}
                className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                disabled={!saveForm.name.trim()}>
                <Save className="mr-1.5 inline h-4 w-4" />
                {saveMode === "draft" ? "仮保存する" : "本保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-600">進捗:</div>
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
              style={{
                width: `${(completedSteps.size / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-700">
          {completedSteps.size} / {steps.length}
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step) => {
          const Icon = step.icon;
          const isOpen = openStep === step.id;
          const isCompleted = completedSteps.has(step.id);

          return (
            <div
              key={step.id}
              className={`overflow-hidden rounded-2xl border transition-all ${
                isCompleted
                  ? "border-emerald-200 bg-emerald-50/30"
                  : "border-slate-200/60 bg-white"
              } shadow-sm`}
            >
              <button
                onClick={() => setOpenStep(isOpen ? 0 : step.id)}
                className="flex w-full items-center gap-4 px-6 py-5 text-left"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-primary-50 text-primary-600"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-bold">{step.id}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      STEP {step.id}: {step.title}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {step.subtitle}
                  </p>
                </div>
                <span className="hidden text-xs text-slate-400 sm:block">
                  {step.duration}
                </span>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-6 pb-6 pt-5">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-slate-800">
                        学習ポイント
                      </h4>
                      <ul className="space-y-2.5">
                        {step.learnContent.map((content, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                            {content}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="mb-4 rounded-xl bg-amber-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                          <Lightbulb className="h-4 w-4" />
                          ポイント＆注意点
                        </div>
                        <ul className="space-y-1.5">
                          {step.tips.map((tip, i) => (
                            <li
                              key={i}
                              className="text-sm leading-relaxed text-amber-700"
                            >
                              ・{tip}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <h4 className="mb-3 text-sm font-semibold text-slate-800">
                        アクション
                      </h4>
                      <div className="space-y-2">
                        {step.actions.map((action, i) =>
                          action.internal ? (
                            <Link
                              key={i}
                              to={action.internal}
                              className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 transition-all hover:bg-primary-100"
                            >
                              <ArrowRight className="h-4 w-4" />
                              {action.label}
                            </Link>
                          ) : (
                            <a
                              key={i}
                              href={action.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {action.label}
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => toggleComplete(step.id)}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isCompleted
                        ? "完了済み（クリックで取消）"
                        : "このステップを完了にする"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
