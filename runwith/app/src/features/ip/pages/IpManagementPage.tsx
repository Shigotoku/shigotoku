import { useState, useEffect } from "react";
import {
  FileText, BadgeCheck, Palette, Shield, Search,
  Plus, Trash2, Edit2, Check, X, Lightbulb,
  Calendar, Banknote, Info, AlertTriangle, Eye,
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

const ipTypes = ["特許", "商標", "意匠", "営業秘密"] as const;
const ipStatuses = ["検討中", "出願準備", "出願済", "審査中", "登録済", "拒絶"] as const;

const statusColors: Record<string, string> = {
  "検討中": "bg-slate-100 text-slate-600",
  "出願準備": "bg-blue-50 text-blue-700",
  "出願済": "bg-violet-50 text-violet-700",
  "審査中": "bg-amber-50 text-amber-700",
  "登録済": "bg-emerald-50 text-emerald-700",
  "拒絶": "bg-red-50 text-red-600",
};

const typeColors: Record<string, string> = {
  "特許": "bg-blue-50 text-blue-700",
  "商標": "bg-violet-50 text-violet-700",
  "意匠": "bg-pink-50 text-pink-700",
  "営業秘密": "bg-amber-50 text-amber-700",
};

const STORAGE_KEY = "runwith-ip";

const emptyForm: Omit<IpItem, "id"> = {
  name: "", type: "特許", status: "検討中",
  filingDate: "", registrationNum: "", notes: "", dueDate: "",
};

export default function IpManagementPage() {
  const [items, setItems] = useState<IpItem[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [monitoredNames, setMonitoredNames] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<IpItem, "id">>(emptyForm);
  const [activeTab, setActiveTab] = useState<"portfolio" | "guide">("portfolio");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // ブランド監視リストを読み込む
  useEffect(() => {
    try {
      const s = localStorage.getItem("runwith-monitoring");
      if (s) {
        const brands: { name: string }[] = JSON.parse(s);
        setMonitoredNames(new Set(brands.map(b => b.name.toLowerCase())));
      }
    } catch { /* ignore */ }
  }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (item: IpItem) => {
    const { id, ...rest } = item;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      setItems(items.map(i => i.id === editingId ? { ...form, id: editingId } : i));
    } else {
      setItems([...items, { ...form, id: crypto.randomUUID() }]);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const remove = (id: string) => {
    if (window.confirm("削除しますか？")) setItems(items.filter(i => i.id !== id));
  };

  const counts = ipTypes.reduce((acc, t) => ({ ...acc, [t]: items.filter(i => i.type === t).length }), {} as Record<string, number>);
  const registered = items.filter(i => i.status === "登録済").length;

  const today = new Date();
  const nearDeadline = items.filter(i => {
    if (!i.dueDate) return false;
    const d = new Date(i.dueDate);
    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 90;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">知財管理</h1>
          <p className="mt-1 text-slate-500">特許・商標・意匠・営業秘密のポートフォリオを一元管理します。</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> 知財を追加
        </button>
      </div>

      {/* サマリー */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ipTypes.map(t => (
            <div key={t} className={`rounded-xl border p-4 ${typeColors[t].replace("text-", "border-").replace("50", "200")} ${typeColors[t].replace("text-", "bg-").split(" ")[0]}`}>
              <p className="text-xl font-bold text-slate-900">{counts[t] || 0}</p>
              <p className="text-xs text-slate-600">{t}</p>
            </div>
          ))}
        </div>
      )}

      {/* 期限アラート */}
      {nearDeadline.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">期限が近い知財があります（90日以内）</p>
              <ul className="mt-1 space-y-0.5">
                {nearDeadline.map(i => (
                  <li key={i.id} className="text-xs text-amber-700">
                    • {i.name}（{i.type}）— 期限: {i.dueDate}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {([["portfolio", "ポートフォリオ管理"], ["guide", "知財ガイド"]] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "portfolio" && (
        <div className="space-y-4">
          {/* ブランド監視アピールバナー */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">ブランド監視ツール</h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">推奨</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    登録した商標に類似するサービス名の出現をJ-PlatPat・PR TIMES・App Storeで自動監視します。権利侵害を早期発見できます。
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {[
                      { label: "監視中の商標", value: `${monitoredNames.size}件` },
                      { label: "登録済み商標", value: `${items.filter(i => i.type === "商標" && i.status === "登録済").length}件` },
                    ].map(s => (
                      <span key={s.label} className="rounded-lg bg-white/70 px-2 py-0.5 font-medium text-slate-700">
                        {s.label}: <span className="text-emerald-700">{s.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Link to="/naming/monitoring"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                監視ツールを開く
              </Link>
            </div>
          </div>
          {/* フォーム */}
          {showForm && (
            <div className="rounded-2xl border-2 border-primary-200 bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-sm font-bold text-slate-900">{editingId ? "知財を編集" : "新しい知財を追加"}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">名称 *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="例: ○○に関する発明"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">種別</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as IpItem["type"] })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none">
                    {ipTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">ステータス</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as IpItem["status"] })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none">
                    {ipStatuses.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">出願日</label>
                  <input type="date" value={form.filingDate} onChange={e => setForm({ ...form, filingDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">次の期限</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">登録番号</label>
                  <input type="text" value={form.registrationNum} onChange={e => setForm({ ...form, registrationNum: e.target.value })}
                    placeholder="例: 特許 1234567"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">メモ</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="弁理士名、費用、対応状況など"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={save} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                  <Check className="h-4 w-4" /> {editingId ? "更新" : "追加"}
                </button>
                <button onClick={() => setShowForm(false)} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">
                  <X className="h-4 w-4" /> キャンセル
                </button>
              </div>
            </div>
          )}

          {/* テーブル */}
          {items.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16">
              <BadgeCheck className="mb-3 h-12 w-12 text-slate-300" />
              <p className="font-medium text-slate-600">知財がまだ登録されていません</p>
              <p className="mt-1 text-sm text-slate-400">特許・商標・意匠を追加して一元管理しましょう</p>
              <button onClick={openAdd} className="mt-4 flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
                <Plus className="h-4 w-4" /> 知財を追加
              </button>
            </div>
          ) : items.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-medium text-slate-500">
                      <th className="px-5 py-3">名称</th>
                      <th className="px-5 py-3">種別</th>
                      <th className="px-5 py-3">ステータス</th>
                      <th className="px-5 py-3">出願日</th>
                      <th className="px-5 py-3">期限</th>
                      <th className="px-5 py-3">登録番号</th>
                      <th className="px-5 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const isMonitored = item.type === "商標" && monitoredNames.has(item.name.toLowerCase());
                      return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {isMonitored && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                <Shield className="h-2.5 w-2.5" />監視中
                              </span>
                            )}
                          </div>
                          {item.notes && <p className="text-[11px] font-normal text-slate-400">{item.notes}</p>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${typeColors[item.type]}`}>{item.type}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}>{item.status}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{item.filingDate || "—"}</td>
                        <td className="px-5 py-3">
                          {item.dueDate ? (
                            <span className={`text-xs ${
                              (() => {
                                const diff = (new Date(item.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
                                return diff < 30 ? "font-semibold text-red-600" : diff < 90 ? "font-medium text-amber-600" : "text-slate-600";
                              })()
                            }`}>
                              {item.dueDate}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{item.registrationNum || "—"}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => remove(item.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {activeTab === "guide" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[
            {
              icon: FileText, title: "特許戦略",
              content: "発明 → 先行技術調査 → 明細書作成 → 出願 → 審査請求 → 登録",
              cost: "出願: 30〜50万円 / 審査請求: 15〜20万円",
              warning: "出願から1年3ヶ月以内に審査請求が必要。優先権は出願から1年以内。",
              tips: ["コアな発明は早期に出願し市場を確保", "弁理士に先行技術調査を依頼", "分割出願で請求範囲を最大化"],
            },
            {
              icon: BadgeCheck, title: "商標管理",
              content: "商品・役務の区分（1〜45類）から自社事業に該当する区分を選択。",
              cost: "出願印紙: 12,000円 + 登録免許税: 32,900円/区分",
              warning: "登録から10年ごとに更新（満了6ヶ月前〜1ヶ月前まで申請可能）",
              tips: ["社名・ブランド名・ロゴは早期登録", "複数区分を検討（将来の事業も考慮）", "ドメインとの権利確保をセットで"],
            },
            {
              icon: Palette, title: "意匠権",
              content: "UIデザイン・画面遷移も意匠登録の対象。2020年改正で画像・動画も保護可能に。",
              cost: "出願: 約16,000円 / 登録: 20,000〜50,000円",
              warning: "公表前に出願しないと権利化不可。公知意匠の調査も忘れずに。",
              tips: ["アプリのUI/UXも意匠登録可能", "関連意匠でバリエーション保護", "デザインリニューアル前に確認"],
            },
            {
              icon: Shield, title: "営業秘密管理",
              content: "秘密管理性・有用性・非公知性の3要件で不競法による保護を受けられる。",
              cost: "制度整備費用（NDA・アクセス管理等）",
              warning: "要件を満たさないと法的保護なし。管理体制の文書化が重要。",
              tips: ["NDA・秘密保持誓約書を整備", "アクセス制限・ログ管理の実施", "退職者対応手順を明確化"],
            },
          ].map(({ icon: Icon, title, content, cost, warning, tips }) => (
            <div key={title} className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Icon className="h-5 w-5 text-slate-500" />
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
              </div>
              <p className="mb-3 text-sm text-slate-600">{content}</p>
              <div className="mb-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <span className="text-slate-600">{cost}</span>
              </div>
              <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span className="text-amber-700">{warning}</span>
              </div>
              <ul className="space-y-1">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
