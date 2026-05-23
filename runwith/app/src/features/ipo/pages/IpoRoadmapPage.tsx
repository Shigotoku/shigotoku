import { useState, useEffect } from "react";
import {
  Calendar, FileText, Building2, Scale, Shield,
  TrendingUp, Banknote, CheckCircle2, Circle, ChevronDown, ChevronUp,
} from "lucide-react";

interface RoadmapTask {
  id: string;
  text: string;
  done: boolean;
}

interface RoadmapPeriod {
  id: string;
  period: string;
  label: string;
  color: string;
  tasks: RoadmapTask[];
  costs: { label: string; range: string }[];
  tips: string[];
}

const createTasks = (texts: string[]): RoadmapTask[] =>
  texts.map((text, i) => ({ id: `t-${i}`, text, done: false }));

const initialPeriods: RoadmapPeriod[] = [
  {
    id: "n3", period: "N-3期", label: "準備期", color: "bg-slate-800",
    tasks: createTasks([
      "監査法人によるショートレビュー（任意監査の検討）",
      "主幹事証券会社の選定・打診",
      "内部統制の基本方針策定",
      "社内規程の整備開始（就業規則・稟議・経費等）",
      "会計基準の統一（IFRS/J-GAAPの選択）",
      "経理体制の強化（人員・システム）",
      "株主構成の整理・ストックオプション制度の見直し",
      "上場スケジュールの大枠策定",
    ]),
    costs: [
      { label: "監査法人（任意）", range: "年間500〜1,000万円" },
      { label: "顧問弁護士", range: "年間200〜500万円" },
    ],
    tips: [
      "主幹事証券と監査法人は早期決定でスケジュールが組みやすくなる",
      "内部統制は「作って終わり」ではなく運用の定着が重要",
    ],
  },
  {
    id: "n2", period: "N-2期", label: "基盤構築期", color: "bg-blue-600",
    tasks: createTasks([
      "会計監査の正式開始（監査証明の取得開始）",
      "J-SOX（内部統制報告制度）対応の本格化",
      "予算管理体制の構築（月次・四半期レビュー）",
      "取締役会運営体制の整備（議事録・招集手続の標準化）",
      "社外取締役の選任（最低1名、推奨2名以上）",
      "監査役・監査委員会の設置検討",
      "IR体制の構築（IR担当者の配置）",
      "株主総会運営の標準化",
      "内部通報制度の整備",
    ]),
    costs: [
      { label: "監査法人", range: "年間2,000〜3,000万円" },
      { label: "主幹事証券", range: "着手金等" },
      { label: "弁護士・税理士", range: "年間500〜1,000万円" },
    ],
    tips: [
      "社外取締役は経営理念を共有できる人材を早期から",
      "J-SOXはIT全般統制と業務プロセス統制の両面で対応",
    ],
  },
  {
    id: "n1", period: "N-1期", label: "申請準備期", color: "bg-violet-600",
    tasks: createTasks([
      "内部統制の運用・テスト（実効性の検証）",
      "有価証券上場申請書 Ⅰの部の準備",
      "引受審査への対応（主幹事証券によるDD）",
      "東証との事前確認・ヒアリング",
      "適時開示・IR規程の最終整備",
      "コーポレートガバナンス体制の最終確認",
      "株主優待・配当方針の検討",
      "上場時の株式数・公募価格の方針検討",
    ]),
    costs: [
      { label: "監査法人", range: "年間2,000〜3,000万円" },
      { label: "主幹事証券着手金", range: "交渉による" },
      { label: "内部統制コスト", range: "年間500〜1,500万円" },
    ],
    tips: [
      "申請書類の作成は想定より時間がかかる。余裕を持ったスケジュールで",
      "東証事前確認で指摘事項を申請前に解消する",
    ],
  },
  {
    id: "n0", period: "N期（申請期）", label: "上場期", color: "bg-emerald-600",
    tasks: createTasks([
      "有価証券上場申請書の提出",
      "東証審査（書面審査・質問・ヒアリング）",
      "上場承認の取得",
      "ブックビルディング（公募価格の決定）",
      "株主割当・公募の実施",
      "上場日の確定・IR戦略の最終化",
      "上場初日・IRイベント・記者会見",
      "継続開示義務の履行開始（四半期決算等）",
    ]),
    costs: [
      { label: "主幹事報酬", range: "調達額の3〜5%" },
      { label: "印刷・IR費用", range: "500〜1,000万円" },
      { label: "その他諸経費", range: "200〜500万円" },
    ],
    tips: [
      "審査期間は通常2〜4ヶ月。質問への回答は迅速・正確に",
      "上場後は四半期決算・適時開示が義務。IR体制確立が先",
    ],
  },
];

const STORAGE_KEY = "runwith-ipo";

const costSummary = [
  { label: "監査法人", range: "年1,000〜3,000万円", icon: FileText },
  { label: "主幹事証券", range: "上場時に調達額の3〜5%", icon: Building2 },
  { label: "弁護士・税理士", range: "年500〜1,000万円", icon: Scale },
  { label: "内部統制", range: "年500〜1,500万円", icon: Shield },
  { label: "印刷・IR", range: "500〜1,000万円", icon: TrendingUp },
];

export default function IpoRoadmapPage() {
  const [periods, setPeriods] = useState<RoadmapPeriod[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedData = JSON.parse(saved) as { id: string; tasks: { id: string; done: boolean }[] }[];
        return initialPeriods.map(p => {
          const sp = savedData.find(d => d.id === p.id);
          return {
            ...p,
            tasks: p.tasks.map(t => {
              const st = sp?.tasks.find(d => d.id === t.id);
              return { ...t, done: st?.done ?? false };
            }),
          };
        });
      }
    } catch { /* ignore */ }
    return initialPeriods;
  });
  const [expandedPeriod, setExpandedPeriod] = useState<string>("n3");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(
      periods.map(p => ({ id: p.id, tasks: p.tasks.map(t => ({ id: t.id, done: t.done })) }))
    ));
  }, [periods]);

  const toggleTask = (periodId: string, taskId: string) => {
    setPeriods(prev => prev.map(p =>
      p.id === periodId
        ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) }
        : p
    ));
  };

  const totalTasks = periods.reduce((s, p) => s + p.tasks.length, 0);
  const doneTasks = periods.reduce((s, p) => s + p.tasks.filter(t => t.done).length, 0);
  const overallPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">IPOロードマップ</h1>
        <p className="mt-1 text-slate-500">N-3期から上場日までの主要タスクをインタラクティブに管理。進捗は自動保存されます。</p>
      </div>

      {/* 全体進捗 */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">全体進捗</h2>
          <span className="text-sm text-slate-500">{doneTasks} / {totalTasks} タスク完了</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
        <div className="mt-4 flex justify-between">
          {periods.map((p, i) => {
            const done = p.tasks.filter(t => t.done).length;
            const pct = Math.round((done / p.tasks.length) * 100);
            const allDone = done === p.tasks.length;
            return (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${allDone ? "bg-emerald-500" : p.color}`}>
                  {allDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <p className="text-[10px] font-medium text-slate-700">{p.period}</p>
                <p className="text-[10px] text-slate-500">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 費用サマリー */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <Banknote className="h-5 w-5 text-slate-500" /> 費用目安サマリー
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {costSummary.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                </div>
                <p className="text-xs text-slate-600">{item.range}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 期別タイムライン */}
      <div className="space-y-3">
        {periods.map(period => {
          const doneCnt = period.tasks.filter(t => t.done).length;
          const isExpanded = expandedPeriod === period.id;
          const allDone = doneCnt === period.tasks.length;

          return (
            <div key={period.id} className={`overflow-hidden rounded-2xl border shadow-sm ${allDone ? "border-emerald-200" : "border-slate-200/60"} bg-white`}>
              <button
                onClick={() => setExpandedPeriod(isExpanded ? "" : period.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${allDone ? "bg-emerald-500" : period.color}`}>
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900">{period.period}</h2>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{period.label}</span>
                    {allDone && <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">完了</span>}
                  </div>
                  <p className="text-xs text-slate-500">{doneCnt} / {period.tasks.length} タスク完了</p>
                </div>
                <div className="mr-2 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${allDone ? "bg-emerald-500" : period.color}`}
                    style={{ width: `${(doneCnt / period.tasks.length) * 100}%` }}
                  />
                </div>
                {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* タスクリスト */}
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-slate-700">主要タスク（クリックで完了）</h3>
                      <div className="space-y-1.5">
                        {period.tasks.map(task => (
                          <label
                            key={task.id}
                            className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                          >
                            <button
                              type="button"
                              onClick={() => toggleTask(period.id, task.id)}
                              className="mt-0.5 shrink-0"
                            >
                              {task.done
                                ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                : <Circle className="h-5 w-5 text-slate-300" />}
                            </button>
                            <span className={`text-sm ${task.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                              {task.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* 費用 */}
                      <div className="rounded-xl bg-slate-50 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-700">この期の費用目安</h3>
                        <div className="space-y-1.5">
                          {period.costs.map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">{c.label}</span>
                              <span className="font-medium text-slate-800">{c.range}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* ポイント */}
                      <div className="rounded-xl bg-amber-50 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-amber-800">この期のポイント</h3>
                        <ul className="space-y-1.5">
                          {period.tips.map((tip, i) => (
                            <li key={i} className="text-xs text-amber-700">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
        <p className="text-xs leading-relaxed text-slate-500">
          ※ Nは上場申請を行う事業年度。グロース・プライム等の市場により審査期間や要件が異なります。
          主幹事証券・監査法人と早期に相談し、自社に合ったスケジュールを策定してください。タスクの進捗はブラウザに保存されます。
        </p>
      </div>
    </div>
  );
}
