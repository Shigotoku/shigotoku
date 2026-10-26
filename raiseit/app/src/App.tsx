import { useCallback, useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { api, auth, type ActionState, type Detail, type Summary } from "./lib";
import { C, type Ctx } from "./ui";
import AuthAction from "./AuthAction";
import { ActionsPage, HistoryPage } from "./pages-main";
import { Home } from "./pages-home";
import { CompliancePage, FunnelPage, SettingsPage } from "./pages-other";
import { DetailPage } from "./pages-detail";
import { CompetitorsPage } from "./pages-competitors";


function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch {
      setMsg("メールアドレスまたはパスワードが違います。");
    }
    setBusy(false);
  };
  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={go} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <div>
          <div className="text-2xl font-bold">レイジット</div>
          <div className="text-sm text-slate-500">データで見つける → 安全に直す → 効果を測る</div>
        </div>
        <input className="w-full border rounded-lg p-3" type="email" autoComplete="username" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded-lg p-3" type="password" autoComplete="current-password" placeholder="パスワード" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <button disabled={busy} className="w-full rounded-lg bg-ink text-white py-3 font-semibold disabled:opacity-50">ログイン</button>
        <p className="text-xs text-slate-500">パスワードを忘れた場合は、管理者(オーナー)にパスワード設定リンクの再発行を依頼してください。</p>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </form>
    </div>
  );
}

function Shell({ user }: { user: User }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [site, setSite] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const me = await api<{ role: string }>("/me");
      setRole(me.role);
      const sites = await api<{ id: string }[]>("/sites");
      const id = site || sites[0]?.id;
      if (!id) throw new Error("no site");
      setSite(id);
      const r = await api<{ summary: Summary; state: ActionState }>(`/summary?site=${id}`);
      setSummary(r.summary);
      setState(r.state);
      api<Detail>(`/detail?site=${id}`).then(setDetail).catch(() => setDetail(null));
    } catch (e) {
      const s = (e as { status?: number }).status;
      setError(s === 403 ? "このアカウントには権限がありません。管理者に追加を依頼してください。" : s === 404 ? "集計データがまだ作成されていません(翌朝に反映されます)。" : "読み込みに失敗しました。");
    }
    setLoading(false);
  }, [site]);
  useEffect(() => { void load(); }, [load]);

  const setStatus: Ctx["setStatus"] = async (a, status, note) => {
    setState((s) => ({ ...s, [a.id]: { status, note: note ?? "" } }));
    try {
      await api(`/actions/${encodeURIComponent(a.id)}`, { method: "POST", body: { site, status, note, title: a.title, url: a.url } });
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
      void load();
    }
  };

  const nav = [["/", "今月の結論"], ["/actions", "改善候補"], ["/funnel", "流入・漏斗"], ["/detail", "詳細データ"], ["/competitors", "競合"], ["/compliance", "文案チェック"], ["/history", "施策履歴"], ["/settings", "設定"]] as const;
  return (
    <C.Provider value={{ summary, detail, site, state, error, loading, role, email: user.email ?? "", reload: load, setStatus }}>
      <div className="min-h-dvh pb-20 lg:pb-0 lg:pl-44">
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-44 flex-col bg-ink text-white p-4 gap-1">
          <div className="text-lg font-bold mb-4">レイジット</div>
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-white/15 font-semibold" : "text-white/70"}`}>{label}</NavLink>
          ))}
          <button onClick={() => signOut(auth)} className="mt-auto text-left text-xs text-white/60 px-3">ログアウト</button>
        </aside>
        <main className="w-full p-3 lg:p-5">
          {error && <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">{error}</div>}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/actions" element={<ActionsPage />} />
            <Route path="/funnel" element={<FunnelPage />} />
            <Route path="/detail" element={<DetailPage />} />
            <Route path="/competitors" element={<CompetitorsPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t grid grid-cols-8 text-[10px] pb-[env(safe-area-inset-bottom)]">
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `py-3 text-center ${isActive ? "text-mint font-bold" : "text-slate-500"}`}>{label.replace("・", "")}</NavLink>
          ))}
        </nav>
      </div>
    </C.Provider>
  );
}

export default function App() {
  if (window.location.pathname === "/auth/action") return <AuthAction />;
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  if (user === undefined) return <div className="p-8 text-slate-500">読み込み中…</div>;
  return user ? <Shell user={user} /> : <Login />;
}


