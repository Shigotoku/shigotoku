import { useState, useEffect } from "react";
import {
  Users, Plus, Trash2, Edit2, Check, X, UserPlus,
  PieChart, Mail, Calendar, Award, AlertCircle,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  title: string;
  equity: number;
  email: string;
  bio: string;
  joinDate: string;
  isFounder: boolean;
}

const STORAGE_KEY = "runwith-team";

const defaultMembers: TeamMember[] = [];

const roleColors: Record<string, string> = {
  CEO: "bg-blue-50 text-blue-700 border-blue-200",
  CTO: "bg-violet-50 text-violet-700 border-violet-200",
  COO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CFO: "bg-amber-50 text-amber-700 border-amber-200",
  CMO: "bg-pink-50 text-pink-700 border-pink-200",
  CPO: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Other: "bg-slate-50 text-slate-600 border-slate-200",
};

const barColors = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500",
];

const emptyForm: Omit<TeamMember, "id"> = {
  name: "", role: "CEO", title: "", equity: 0,
  email: "", bio: "", joinDate: "", isFounder: true,
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : defaultMembers;
    } catch { return defaultMembers; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<TeamMember, "id">>(emptyForm);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  }, [members]);

  const totalEquity = members.reduce((s, m) => s + m.equity, 0);
  const remainingEsop = Math.max(0, 100 - totalEquity);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (m: TeamMember) => {
    setForm({ name: m.name, role: m.role, title: m.title, equity: m.equity, email: m.email, bio: m.bio, joinDate: m.joinDate, isFounder: m.isFounder });
    setEditingId(m.id);
    setShowForm(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      setMembers(members.map(m => m.id === editingId ? { ...form, id: editingId } : m));
    } else {
      setMembers([...members, { ...form, id: crypto.randomUUID() }]);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const remove = (id: string) => {
    if (window.confirm("このメンバーを削除しますか？")) setMembers(members.filter(m => m.id !== id));
  };

  const inp = (label: string, key: keyof Omit<TeamMember, "id">, type = "text", placeholder = "") => (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        value={form[key] as string | number}
        onChange={e => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-100"
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">チーム管理</h1>
          <p className="mt-1 text-slate-500">メンバーの役割・株式配分を管理。DDや投資家提案に活用できます。</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700"
        >
          <UserPlus className="h-4 w-4" /> メンバー追加
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="rounded-2xl border-2 border-primary-200 bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-sm font-bold text-slate-900">{editingId ? "メンバーを編集" : "新しいメンバーを追加"}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {inp("氏名 *", "name", "text", "山田 太郎")}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">役割</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              >
                {Object.keys(roleColors).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {inp("肩書き", "title", "text", "代表取締役 CEO")}
            {inp("メールアドレス", "email", "email", "yamada@example.com")}
            {inp("持株比率（%）", "equity", "number")}
            {inp("参画日", "joinDate", "date")}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">略歴・スキルセット</label>
              <textarea
                rows={2}
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="前職・専門領域・この問題に取り組む理由など"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="founder"
                checked={form.isFounder}
                onChange={e => setForm({ ...form, isFounder: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="founder" className="text-sm text-slate-700">創業者</label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              <Check className="h-4 w-4" /> {editingId ? "更新" : "追加"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">
              <X className="h-4 w-4" /> キャンセル
            </button>
          </div>
        </div>
      )}

      {members.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
          <Users className="mb-3 h-12 w-12 text-slate-300" />
          <p className="font-medium text-slate-600">まだメンバーが登録されていません</p>
          <p className="mt-1 text-sm text-slate-400">「メンバー追加」ボタンから登録してください</p>
          <button onClick={openAdd} className="mt-4 flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" /> 最初のメンバーを追加
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* メンバーリスト */}
          <div className="lg:col-span-2 space-y-3">
            {members.map((member, idx) => (
              <div key={member.id} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-accent-100 text-lg font-bold text-primary-700">
                    {member.name ? member.name[0] : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{member.name}</p>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${roleColors[member.role] || roleColors.Other}`}>
                        {member.role}
                      </span>
                      {member.isFounder && (
                        <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          <Award className="h-3 w-3" /> 創業者
                        </span>
                      )}
                    </div>
                    {member.title && <p className="mt-0.5 text-xs text-slate-500">{member.title}</p>}
                    {member.email && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <Mail className="h-3 w-3" /> {member.email}
                      </p>
                    )}
                    {member.bio && <p className="mt-2 text-xs leading-relaxed text-slate-600">{member.bio}</p>}
                    {member.joinDate && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="h-3 w-3" /> 参画: {member.joinDate}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    <p className={`text-xl font-bold ${member.equity > 0 ? "text-slate-900" : "text-slate-300"}`}>
                      {member.equity > 0 ? `${member.equity}%` : "—"}
                    </p>
                    <p className="text-[10px] text-slate-400">持株</p>
                    <div className="mt-2 flex gap-1">
                      <button onClick={() => openEdit(member)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(member.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* サイドパネル */}
          <div className="space-y-5">
            {/* 株式配分 */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary-500" />
                <h3 className="text-sm font-bold text-slate-900">株式配分</h3>
              </div>
              <div className="space-y-2.5">
                {members.filter(m => m.equity > 0).map((m, idx) => (
                  <div key={m.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-600">{m.name}</span>
                      <span className="font-semibold text-slate-900">{m.equity}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${barColors[idx % barColors.length]}`}
                        style={{ width: `${m.equity}%` }}
                      />
                    </div>
                  </div>
                ))}
                {remainingEsop > 0 && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-400">未割当</span>
                      <span className="text-slate-400">{remainingEsop}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-200" style={{ width: `${remainingEsop}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-600">合計</span>
                  <span className={totalEquity === 100 ? "text-emerald-600" : totalEquity > 100 ? "text-red-500" : "text-amber-600"}>
                    {totalEquity}%
                  </span>
                </div>
                {totalEquity > 100 && (
                  <p className="mt-1 flex items-start gap-1 text-[11px] text-red-500">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    合計が100%を超えています
                  </p>
                )}
                {totalEquity < 100 && totalEquity > 0 && (
                  <p className="mt-1 text-[11px] text-amber-600">残り {100 - totalEquity}% 未割当</p>
                )}
              </div>
            </div>

            {/* チーム概要 */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-900">チーム概要</h3>
              <div className="space-y-2 text-sm">
                {[
                  ["総メンバー数", `${members.length}名`],
                  ["創業者", `${members.filter(m => m.isFounder).length}名`],
                  ["ESOP推奨枠", "10〜15%"],
                  ["株主間契約", "VC入金前に締結推奨"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium text-slate-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ESOP案内 */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-800 mb-1">ESOPについて</p>
              <p className="text-xs leading-relaxed text-amber-700">
                ストックオプション（ESOP）は優秀な人材獲得の手段として有効です。シード期から10〜15%を確保しておくことを推奨します。ベスティングスケジュール（4年・1年クリフ）の設定も検討してください。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
