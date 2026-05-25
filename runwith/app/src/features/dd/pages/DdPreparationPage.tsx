import { useState, useMemo } from "react";
import {
  FileSpreadsheet, Scale, Briefcase, Receipt, Users,
  CheckCircle2, Circle, Lightbulb, ChevronDown, ChevronUp,
  StickyNote, X, Edit3, Check,
} from "lucide-react";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  note: string;
}

interface DdSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: ChecklistItem[];
}

const createItems = (labels: string[]): ChecklistItem[] =>
  labels.map((label, i) => ({ id: `item-${i}`, label, done: false, note: "" }));

const initialSections: DdSection[] = [
  {
    id: "financial", title: "財務DD", icon: FileSpreadsheet,
    items: createItems([
      "過去3期の決算書（貸借対照表・損益計算書・CF計算書）",
      "月次推移表（売上・利益・キャッシュ）12ヶ月分",
      "資金繰り表（12ヶ月以上の見通し）",
      "売上の内訳と根拠（顧客別・製品別）",
      "予算実績差異分析",
      "売掛金・在庫・買掛金の内訳と回収状況",
      "固定費・変動費の構造分析",
      "将来財務予測とその前提・根拠",
      "連結範囲と子会社の状況",
      "会計方針・見積りの一貫性確認",
      "設備投資の計画・実績",
    ]),
  },
  {
    id: "legal", title: "法務DD", icon: Scale,
    items: createItems([
      "定款（最新版）",
      "登記簿謄本（法人・役員等）",
      "株主名簿・新株予約権原簿",
      "主要取引契約書一覧",
      "訴訟・紛争・クレームの有無",
      "知財リスト（特許・商標・著作権等）",
      "コンプライアンス体制・内部通報制度",
      "個人情報保護・セキュリティポリシー",
      "主要契約の解約条件・スイッチングコスト",
      "許認可・ライセンスの確認",
    ]),
  },
  {
    id: "business", title: "事業DD", icon: Briefcase,
    items: createItems([
      "事業計画書（中長期、3〜5年）",
      "市場分析（TAM/SAM/SOM・成長率）",
      "競合分析・差別化ポイント",
      "KPI推移（MRR・顧客数・Churn・NRR等）",
      "主要顧客リスト（上位10〜20社）",
      "パイプライン・商談ステータス",
      "製品ロードマップ",
      "技術・ノウハウの独自性・Moat",
      "パートナーシップ・アライアンス",
    ]),
  },
  {
    id: "tax", title: "税務DD", icon: Receipt,
    items: createItems([
      "法人税・消費税・地方税申告書（過去3期）",
      "税務調査の履歴と指摘事項",
      "移転価格対応（グループ会社取引がある場合）",
      "繰越欠損金の詳細",
      "消費税課税事業者選択の状況",
      "税務上のリスク（引当金・評価損等）",
    ]),
  },
  {
    id: "hr", title: "人事DD", icon: Users,
    items: createItems([
      "組織図（最新版）",
      "従業員リスト（役職・入社日・給与帯）",
      "給与テーブル・等級・評価制度",
      "ストックオプション付与状況と行使価格",
      "主要人材のリテンション施策",
      "就業規則・各種社内規程",
      "採用計画・人員計画",
      "離職率・エンゲージメントデータ",
    ]),
  },
];

const STORAGE_KEY = "runwith-dd";

type SavedSection = { id: string; items: { id: string; done: boolean; note: string }[] };

function mergeSections(saved: SavedSection[]): DdSection[] {
  if (!saved.length) return initialSections;
  return initialSections.map((sec) => {
    const savedSec = saved.find((s) => s.id === sec.id);
    return {
      ...sec,
      items: sec.items.map((item) => {
        const savedItem = savedSec?.items.find((i) => i.id === item.id);
        return { ...item, done: savedItem?.done ?? false, note: savedItem?.note ?? "" };
      }),
    };
  });
}

const ddTips = [
  { num: "01", text: "DD開始の2〜4週間前に資料を整備。投資家の想定質問Q&Aを作成しておく。" },
  { num: "02", text: "財務数値は一貫性が命。決算書・月次・予測の数値が矛盾しないよう整合確認。" },
  { num: "03", text: "契約書は重要条項（解約・競業・IP帰属・Change of Control条項等）を要約。" },
  { num: "04", text: "知財は権利帰属（従業員発明・委託開発）を明確化。FTO分析も実施。" },
  { num: "05", text: "人事DDでキーパーソン依存度とリテンションリスクを説明できるよう準備。" },
  { num: "06", text: "税務リスクは先手を打って開示。隠蔽は後で深刻なダメージになる。" },
];

export default function DdPreparationPage() {
  const [savedSections, setSavedSections] = useCompanyStorageState<SavedSection[]>(STORAGE_KEY, []);
  const sections = useMemo(() => mergeSections(savedSections), [savedSections]);
  const setSections = (updater: DdSection[] | ((prev: DdSection[]) => DdSection[])) => {
    setSavedSections((prev) => {
      const merged = mergeSections(prev);
      const next = typeof updater === "function" ? updater(merged) : updater;
      return next.map((s) => ({ id: s.id, items: s.items.map((i) => ({ id: i.id, done: i.done, note: i.note })) }));
    });
  };
  const [expandedSection, setExpandedSection] = useState<string | null>("financial");
  const [editingNote, setEditingNote] = useState<{ sectionId: string; itemId: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const toggleItem = (sectionId: string, itemId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId
        ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) }
        : s
    ));
  };

  const saveNote = () => {
    if (!editingNote) return;
    setSections(prev => prev.map(s =>
      s.id === editingNote.sectionId
        ? { ...s, items: s.items.map(i => i.id === editingNote.itemId ? { ...i, note: noteDraft } : i) }
        : s
    ));
    setEditingNote(null);
  };

  const totalItems = sections.reduce((s, sec) => s + sec.items.length, 0);
  const doneItems = sections.reduce((s, sec) => s + sec.items.filter(i => i.done).length, 0);
  const readinessPercent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">DD（デューデリジェンス）対策</h1>
        <p className="mt-1 text-slate-500">投資家DDに備え、財務・法務・事業・税務・人事の資料準備を管理します。進捗は自動保存。</p>
      </div>

      {/* 全体進捗 */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">準備状況</h2>
              <span className="text-sm text-slate-500">{doneItems} / {totalItems} 完了</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  readinessPercent >= 80 ? "bg-emerald-500" :
                  readinessPercent >= 50 ? "bg-amber-500" : "bg-primary-500"
                }`}
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {sections.map(s => {
                const done = s.items.filter(i => i.done).length;
                const pct = Math.round((done / s.items.length) * 100);
                return (
                  <div key={s.id} className="text-center">
                    <p className="text-sm font-bold text-slate-900">{pct}%</p>
                    <p className="text-[10px] text-slate-500">{s.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`shrink-0 rounded-xl px-5 py-3 text-center text-sm font-bold ${
            readinessPercent >= 80 ? "bg-emerald-50 text-emerald-700" :
            readinessPercent >= 50 ? "bg-amber-50 text-amber-700" :
            "bg-slate-100 text-slate-600"
          }`}>
            <p className="text-2xl font-extrabold">{readinessPercent}%</p>
            <p>{readinessPercent >= 80 ? "準備完了" : readinessPercent >= 50 ? "準備中" : "要対応"}</p>
          </div>
        </div>
      </div>

      {/* チェックリスト */}
      <div className="space-y-3">
        {sections.map(section => {
          const Icon = section.icon;
          const sectionDone = section.items.filter(i => i.done).length;
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{section.title}</h3>
                  <p className="text-xs text-slate-500">{sectionDone} / {section.items.length} 完了</p>
                </div>
                <div className="mr-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${sectionDone === section.items.length ? "bg-emerald-500" : "bg-primary-500"}`}
                    style={{ width: `${(sectionDone / section.items.length) * 100}%` }}
                  />
                </div>
                {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="space-y-1">
                    {section.items.map(item => (
                      <div key={item.id}>
                        <div className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50">
                          <button
                            onClick={() => toggleItem(section.id, item.id)}
                            className="mt-0.5 shrink-0"
                          >
                            {item.done
                              ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              : <Circle className="h-5 w-5 text-slate-300" />}
                          </button>
                          <div className="flex-1">
                            <span className={`text-sm ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                              {item.label}
                            </span>
                            {item.note && (
                              <p className="mt-0.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">{item.note}</p>
                            )}
                            {editingNote?.sectionId === section.id && editingNote.itemId === item.id && (
                              <div className="mt-2 flex gap-2">
                                <input
                                  type="text"
                                  value={noteDraft}
                                  onChange={e => setNoteDraft(e.target.value)}
                                  placeholder="メモを入力..."
                                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-primary-400 focus:outline-none"
                                  onKeyDown={e => e.key === "Enter" && saveNote()}
                                />
                                <button onClick={saveNote} className="rounded-lg bg-primary-600 px-2 py-1.5 text-xs text-white hover:bg-primary-700">
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => setEditingNote(null)} className="rounded-lg bg-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-300">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setEditingNote({ sectionId: section.id, itemId: item.id });
                              setNoteDraft(item.note);
                            }}
                            className="shrink-0 rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                            title="メモを追加"
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DDポイント */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <Lightbulb className="h-5 w-5 text-amber-500" /> DD対策のポイント
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ddTips.map(tip => (
            <div key={tip.num} className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">{tip.num}</span>
              <p className="text-sm text-slate-600">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
