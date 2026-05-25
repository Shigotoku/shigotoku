import { useState, useMemo } from "react";
import {
  FileText, ChevronDown, ChevronUp, Scale, Clock, Calendar,
  Building2, Calculator, LogOut, Info, BookOpen, Search,
  CheckCircle2, Circle, Bookmark, BookmarkCheck,
} from "lucide-react";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";

interface ContentBlock {
  subtitle?: string;
  items?: string[];
  table?: { headers: string[]; rows: string[][] };
  tips?: string[];
  legalRef?: string;
}

interface Section {
  id: string;
  title: string;
  icon: typeof FileText;
  priority: "必須" | "重要" | "推奨";
  content: ContentBlock[];
  checklist?: string[];
}

const sections: Section[] = [
  {
    id: "work-rules", title: "就業規則の作成", icon: FileText, priority: "必須",
    checklist: [
      "就業規則（案）を作成した",
      "従業員代表に意見聴取を実施した",
      "労働基準監督署に届出た（10人以上の場合）",
      "従業員に周知した（掲示・配布等）",
    ],
    content: [
      {
        subtitle: "記載必須事項（絶対的記載事項）",
        items: [
          "始業・終業時刻、休憩時間、休日、休暇",
          "賃金の決定・計算・支払方法、昇給に関する事項",
          "退職に関する事項（解雇の事由を含む）",
          "退職手当の定め（適用される労働者の範囲）",
          "臨時の賃金・最低賃金額の定め",
          "食費・作業用品等の負担",
          "安全衛生",
          "職業訓練",
          "災害補償・業務外傷病扶助",
          "表彰・制裁（種類・程度）",
          "その他全労働者に適用される事項",
        ],
      },
      {
        subtitle: "作成・届出手順",
        items: [
          "1. 草案作成（弁護士・社労士のレビュー推奨）",
          "2. 従業員の過半数代表者から意見聴取（意見書を取得）",
          "3. 所轄労働基準監督署に届出（常時10人以上が必要条件）",
          "4. 労働者への周知（掲示・備付け・電子公開等）",
        ],
      },
      { tips: ["従業員10人未満でも作成推奨。後のトラブル防止に有効"], legalRef: "労働基準法第89条・第90条・第106条" },
    ],
  },
  {
    id: "36-agreement", title: "36協定の締結", icon: Scale, priority: "必須",
    checklist: [
      "時間外労働の予定業務内容を確認した",
      "従業員代表と36協定を締結した",
      "所轄労働基準監督署に届出た",
      "従業員に周知した",
      "特別条項が必要か確認した",
    ],
    content: [
      {
        subtitle: "時間外労働の上限規制（2019年改正）",
        items: [
          "原則: 月45時間・年360時間まで",
          "特別条項あり: 年720時間以内",
          "特別条項あり: 月100時間未満（休日労働含む）",
          "特別条項あり: 2〜6ヶ月の平均が月80時間以内",
          "原則超過可能月数: 年6ヶ月が上限",
        ],
      },
      {
        subtitle: "届出方法",
        items: [
          "労使協定（36協定）の締結",
          "所轄労働基準監督署への届出（電子申請可）",
          "労働者への周知（就業規則同様）",
        ],
      },
      {
        subtitle: "罰則",
        items: [
          "届出なしの時間外労働: 6ヶ月以下の懲役または30万円以下の罰金",
          "上限規制違反: 6ヶ月以下の懲役または30万円以下の罰金",
        ],
      },
      { tips: ["残業が発生する可能性があるなら必ず届出を。スタートアップでも例外なし"], legalRef: "労働基準法第36条" },
    ],
  },
  {
    id: "paid-leave", title: "有給休暇の管理", icon: Calendar, priority: "必須",
    checklist: [
      "入社日から6ヶ月後に有給付与を実施した",
      "有給取得管理台帳を作成・更新している",
      "年5日取得義務の対象者を把握している",
      "計画的付与制度の導入を検討した",
    ],
    content: [
      {
        subtitle: "付与日数テーブル",
        table: {
          headers: ["継続勤務年数", "付与日数"],
          rows: [
            ["6ヶ月", "10日"], ["1年6ヶ月", "11日"], ["2年6ヶ月", "12日"],
            ["3年6ヶ月", "14日"], ["4年6ヶ月", "16日"], ["5年6ヶ月", "18日"],
            ["6年6ヶ月以上", "20日"],
          ],
        },
      },
      {
        subtitle: "年5日取得義務（2019年4月〜）",
        items: [
          "10日以上の有給が発生した労働者に対して義務",
          "使用者（会社）が時季を指定して取得させる義務",
          "1年以内に5日取得できない場合: 30万円以下の罰金",
        ],
      },
      { tips: ["勤怠管理ソフト（KING OF TIME等）を使うと管理が楽"], legalRef: "労働基準法第39条" },
    ],
  },
  {
    id: "social-insurance", title: "社会保険の手続き", icon: Building2, priority: "必須",
    checklist: [
      "法人設立時に健康保険・厚生年金の加入手続きをした",
      "雇用保険の加入手続きをした（雇用時）",
      "労災保険の加入手続きをした（雇用時）",
      "毎月の社会保険料を正確に計算・納付している",
    ],
    content: [
      {
        subtitle: "加入要件と対象",
        items: [
          "健康保険・厚生年金: 法人は1人から強制加入（役員のみでも適用）",
          "雇用保険: 週20時間以上・31日以上雇用見込みの労働者",
          "労災保険: 1人でも雇用すれば全員加入（役員は原則対象外）",
          "社会保険合算の会社負担: 給与の約15〜16%程度",
        ],
      },
      {
        subtitle: "年次手続き",
        items: [
          "算定基礎届（7月10日まで）: 4〜6月報酬の平均で標準報酬月額を見直す",
          "月額変更届: 昇給等で2等級以上変動した場合に随時届出",
          "賞与支払届: 賞与支払いの5日以内に届出",
        ],
      },
      { tips: ["社会保険料は会社側も同額を負担。採用コスト計算に必ず含める"], legalRef: "健康保険法・厚生年金保険法・雇用保険法" },
    ],
  },
  {
    id: "payroll", title: "給与計算の基礎", icon: Calculator, priority: "重要",
    checklist: [
      "給与計算の仕組みを把握している",
      "給与支払い日・締め日を就業規則に規定した",
      "給与ソフトを導入またはアウトソースしている",
      "源泉所得税の納付（翌月10日）を管理している",
    ],
    content: [
      {
        subtitle: "控除計算の順序",
        items: [
          "①　健康保険料（被保険者負担分: 標準報酬月額 × 約5%）",
          "②　厚生年金保険料（被保険者負担分: 標準報酬月額 × 約9.15%）",
          "③　雇用保険料（賃金 × 0.6%）",
          "④　源泉所得税（社会保険控除後の額 × 税率表）",
          "⑤　住民税（前年所得に基づき市区町村が決定・特別徴収）",
        ],
      },
      {
        subtitle: "給与規程のポイント",
        items: [
          "毎月払い・一定期日払い・通貨払いが原則",
          "最低賃金（都道府県別）の遵守",
          "割増賃金: 時間外1.25倍、深夜1.25倍、休日1.35倍",
          "残業代の未払いは労基法違反・未払い請求リスク",
        ],
      },
      { tips: ["freee・マネーフォワードの活用で計算ミスを防止。社労士への外注も有効"] },
    ],
  },
  {
    id: "resignation", title: "退職時の手続き", icon: LogOut, priority: "重要",
    checklist: [
      "退職日から5日以内に雇用保険資格喪失届を提出した",
      "健康保険・厚生年金の資格喪失届を提出した",
      "離職票（1号・2号）を発行して本人に交付した",
      "源泉徴収票を退職後1ヶ月以内に交付した",
    ],
    content: [
      {
        subtitle: "ハローワーク提出（5日以内）",
        items: [
          "雇用保険被保険者資格喪失届",
          "離職証明書（本人に離職票を交付するため）",
          "電子申請（e-Gov）でオンライン提出可能",
        ],
      },
      {
        subtitle: "年金事務所提出（5日以内）",
        items: [
          "健康保険・厚生年金被保険者資格喪失届",
          "健康保険被保険者証の返却",
        ],
      },
      {
        subtitle: "本人への交付書類",
        items: [
          "離職票（1号・2号）: 失業給付申請に必要",
          "源泉徴収票: 退職月の翌月以降、1ヶ月以内",
          "年金記録の確認書類（マイナポータル案内）",
        ],
      },
      { tips: ["退職者からの要求があれば離職票を即日交付。トラブル防止に"], legalRef: "雇用保険法・健康保険法・労働基準法" },
    ],
  },
];

const STORAGE_KEY_BOOKMARKS = "startup-labor-bookmarks";
const STORAGE_KEY_CHECKLIST = "startup-labor-checklist";

export default function LaborGuidePage() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ "work-rules": true });
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarksArr, setBookmarksArr] = useCompanyStorageState<string[]>(STORAGE_KEY_BOOKMARKS, []);
  const [checkedArr, setCheckedArr] = useCompanyStorageState<string[]>(STORAGE_KEY_CHECKLIST, []);
  const bookmarks = useMemo(() => new Set(bookmarksArr), [bookmarksArr]);
  const checkedItems = useMemo(() => new Set(checkedArr), [checkedArr]);
  const [activeTab, setActiveTab] = useState<"all" | "bookmarks">("all");
  const [priorityFilter, setPriorityFilter] = useState<"すべて" | "必須" | "重要" | "推奨">("すべて");

  const toggleBookmark = (id: string) => {
    setBookmarksArr((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return [...n];
    });
  };

  const toggleCheck = (key: string) => {
    setCheckedArr((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return [...n];
    });
  };

  const filteredSections = sections.filter(s => {
    if (activeTab === "bookmarks" && !bookmarks.has(s.id)) return false;
    if (priorityFilter !== "すべて" && s.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.title.toLowerCase().includes(q) ||
        s.content.some(c => [...(c.items || []), ...(c.tips || [])].some(t => t.toLowerCase().includes(q)));
    }
    return true;
  });

  const totalChecks = sections.reduce((s, sec) => s + (sec.checklist?.length ?? 0), 0);
  const doneChecks = [...checkedItems].length;

  const priorityColor: Record<string, string> = {
    必須: "bg-red-50 text-red-700",
    重要: "bg-amber-50 text-amber-700",
    推奨: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">労務管理ガイド</h1>
        <p className="mt-1 text-slate-500">スタートアップが知っておくべき労務知識。チェックリストで対応状況を管理できます。</p>
      </div>

      {/* 進捗バー */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">チェックリスト進捗</p>
          <p className="text-sm text-slate-500">{doneChecks} / {totalChecks} 完了</p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${doneChecks === totalChecks ? "bg-emerald-500" : "bg-gradient-to-r from-primary-500 to-accent-500"}`}
            style={{ width: `${(doneChecks / totalChecks) * 100}%` }}
          />
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="キーワードで検索..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm focus:border-primary-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
            {(["all", "bookmarks"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeTab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>
                {t === "all" ? "すべて" : `★ ブックマーク (${bookmarks.size})`}
              </button>
            ))}
          </div>
          {(["すべて", "必須", "重要", "推奨"] as const).map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${priorityFilter === p ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* セクションリスト */}
      <div className="space-y-3">
        {filteredSections.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p>条件に合うセクションが見つかりませんでした</p>
          </div>
        ) : filteredSections.map(section => {
          const Icon = section.icon;
          const isExpanded = expandedSections[section.id] ?? false;
          const isBookmarked = bookmarks.has(section.id);
          const sectionCheckDone = section.checklist?.filter(
            (_, i) => checkedItems.has(`${section.id}-c${i}`)
          ).length ?? 0;
          const sectionCheckTotal = section.checklist?.length ?? 0;

          return (
            <div key={section.id} className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !isExpanded }))}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Icon className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-slate-900">{section.title}</h2>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${priorityColor[section.priority]}`}>
                        {section.priority}
                      </span>
                    </div>
                    {sectionCheckTotal > 0 && (
                      <p className="text-xs text-slate-500">{sectionCheckDone} / {sectionCheckTotal} チェック完了</p>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => toggleBookmark(section.id)}
                  className={`rounded-lg p-2 transition-colors ${isBookmarked ? "text-amber-500 hover:text-amber-600" : "text-slate-300 hover:text-slate-500"}`}
                >
                  {isBookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                </button>
                <button onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !isExpanded }))}>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100">
                  {/* チェックリスト */}
                  {section.checklist && (
                    <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                      <p className="mb-2 text-xs font-semibold text-slate-600">対応チェックリスト</p>
                      <div className="space-y-1.5">
                        {section.checklist.map((item, i) => {
                          const key = `${section.id}-c${i}`;
                          const done = checkedItems.has(key);
                          return (
                            <label key={i} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white">
                              <button type="button" onClick={() => toggleCheck(key)} className="mt-0.5 shrink-0">
                                {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
                              </button>
                              <span className={`text-xs ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* コンテンツ */}
                  <div className="px-6 py-5">
                    <div className="space-y-5">
                      {section.content.map((block, idx) => (
                        <div key={idx}>
                          {block.subtitle && (
                            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                              <span className="h-1 w-4 rounded-full bg-primary-400" />
                              {block.subtitle}
                            </h3>
                          )}
                          {block.items && (
                            <ul className="space-y-1.5 text-sm text-slate-600">
                              {block.items.map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}
                          {block.table && (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="bg-slate-50">
                                    {block.table.headers.map(h => (
                                      <th key={h} className="border-b border-slate-200 px-4 py-2 text-left text-xs font-semibold text-slate-700">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {block.table.rows.map((row, ri) => (
                                    <tr key={ri} className="border-b border-slate-100 last:border-0">
                                      {row.map((cell, ci) => (
                                        <td key={ci} className="px-4 py-2 text-slate-600">{cell}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {block.tips && (
                            <div className="mt-2 flex items-start gap-2 rounded-xl bg-primary-50 p-3.5">
                              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                              <div className="text-sm text-primary-800">
                                {block.tips.map((tip, i) => <p key={i}>{tip}</p>)}
                              </div>
                            </div>
                          )}
                          {block.legalRef && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                              <BookOpen className="h-3.5 w-3.5" />
                              根拠法令: {block.legalRef}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
