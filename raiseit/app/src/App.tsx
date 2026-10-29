import { useCallback, useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { api, auth, type ActionState, type Detail, type Summary } from "./lib";
import { C, type Ctx } from "./ui";
import AuthAction from "./AuthAction";
import { ActionsPage, HistoryPage } from "./pages-main";
import { Home } from "./pages-home";
import { CompliancePage, FunnelPage, SettingsPage } from "./pages-other";
import { DetailPage } from "./pages-detail";
import { CompetitorsPage } from "./pages-competitors";


function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, pw);
      } else {
        if (pw.length < 8) throw Object.assign(new Error("weak"), { code: "weak" });
        await createUserWithEmailAndPassword(auth, email, pw);
        // 申請内容は承認待ち画面で送信する(ここでは入力値を一時保存)
        sessionStorage.setItem("raiseit.signup", JSON.stringify({ name, company }));
      }
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setMsg(
        mode === "login"
          ? "メールアドレスまたはパスワードが違います。"
          : code.includes("email-already-in-use")
            ? "このメールアドレスはすでに登録されています。ログインしてください。"
            : code === "weak" || code.includes("weak-password")
              ? "パスワードは8文字以上で入力してください。"
              : "登録できませんでした。入力内容を確認してください。",
      );
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
        <div className="grid grid-cols-2 text-sm rounded-lg bg-slate-100 p-1">
          <button type="button" onClick={() => setMode("login")} className={`rounded-md py-1.5 ${mode === "login" ? "bg-white shadow font-semibold" : "text-slate-500"}`}>ログイン</button>
          <button type="button" onClick={() => setMode("register")} className={`rounded-md py-1.5 ${mode === "register" ? "bg-white shadow font-semibold" : "text-slate-500"}`}>新規登録</button>
        </div>
        {mode === "register" && (
          <>
            <input className="w-full border rounded-lg p-3" placeholder="お名前" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="w-full border rounded-lg p-3" placeholder="会社・医療機関名" value={company} onChange={(e) => setCompany(e.target.value)} />
          </>
        )}
        <input className="w-full border rounded-lg p-3" type="email" autoComplete="username" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded-lg p-3" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "パスワード" : "パスワード(8文字以上)"} value={pw} onChange={(e) => setPw(e.target.value)} required />
        <button disabled={busy} className="w-full rounded-lg bg-ink text-white py-3 font-semibold disabled:opacity-50">{mode === "login" ? "ログイン" : "利用を申請する"}</button>
        {mode === "register" ? (
          <p className="text-xs text-slate-500">申請後、管理者が承認するとご利用いただけます。承認されるまでデータは表示されません。</p>
        ) : (
          <p className="text-xs text-slate-500">パスワードを忘れた場合は、管理者(オーナー)にパスワード設定リンクの再発行を依頼してください。</p>
        )}
        {msg && <p className="text-sm text-rose-600">{msg}</p>}
      </form>
    </div>
  );
}

type Me = { member: boolean; role?: string; orgName?: string; request?: { status: string } | null; disabled?: boolean };

function Pending({ me, onChanged }: { me: Me; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const sent = me.request?.status === "pending";
  const rejected = me.request?.status === "rejected";
  useEffect(() => {
    const saved = sessionStorage.getItem("raiseit.signup");
    if (!saved || me.request) return;
    sessionStorage.removeItem("raiseit.signup");
    const v = JSON.parse(saved) as { name: string; company: string };
    void api("/signup", { method: "POST", body: v }).then(onChanged);
  }, [me.request, onChanged]);
  const send = async () => {
    setBusy(true);
    await api("/signup", { method: "POST", body: { name, company } }).catch(() => undefined);
    setBusy(false);
    onChanged();
  };
  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="text-2xl font-bold">レイジット</div>
        {me.disabled && <p className="text-sm">このアカウントは無効になっています。管理者にお問い合わせください。</p>}
        {!me.disabled && sent && <p className="text-sm">利用申請を受け付けました。管理者の承認をお待ちください。承認後、再度ログインすると利用できます。</p>}
        {!me.disabled && rejected && <p className="text-sm">申請は承認されませんでした。心当たりがない場合は管理者にお問い合わせください。</p>}
        {!me.disabled && !sent && !rejected && (
          <>
            <p className="text-sm text-slate-600">このアカウントはまだ利用が承認されていません。申請を送信してください。</p>
            <input className="w-full border rounded-lg p-3" placeholder="お名前" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full border rounded-lg p-3" placeholder="会社・医療機関名" value={company} onChange={(e) => setCompany(e.target.value)} />
            <button disabled={!name.trim() || busy} onClick={send} className="w-full rounded-lg bg-ink text-white py-3 font-semibold disabled:opacity-50">利用を申請する</button>
          </>
        )}
        <button onClick={() => signOut(auth)} className="text-sm text-mint underline">ログアウト</button>
      </div>
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
  const [me, setMe] = useState<Me | null>(null);
  const [site, setSite] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const m = await api<Me>("/me");
      setMe(m);
      if (!m.member) {
        setLoading(false);
        return;
      }
      setRole(m.role ?? "");
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

  useEffect(() => {
    // 30分間操作がなければ自動ログアウト
    let timer = window.setTimeout(() => void signOut(auth), 30 * 60 * 1000);
    const reset = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void signOut(auth), 30 * 60 * 1000); };
    const evs = ["click", "keydown", "pointermove", "scroll"] as const;
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => { window.clearTimeout(timer); evs.forEach((e) => window.removeEventListener(e, reset)); };
  }, []);

  if (me && !me.member) return <Pending me={me} onChanged={() => void load()} />;

  const nav = [["/", "今月の結論"], ["/actions", "改善候補"], ["/funnel", "流入・漏斗"], ["/detail", "詳細データ"], ["/competitors", "競合"], ["/compliance", "文案チェック"], ["/history", "施策履歴"], ["/settings", "設定"]] as const;
  return (
    <C.Provider value={{ summary, detail, site, state, error, loading, role, email: user.email ?? "", reload: load, setStatus }}>
      <div className="min-h-dvh pb-20 lg:pb-0 lg:pl-44">
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-44 flex-col bg-ink text-white p-4 gap-1">
          <div className="text-lg font-bold mb-4">レイジット</div>
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-white/15 font-semibold" : "text-white/70"}`}>{label}</NavLink>
          ))}
          <div className="mt-auto px-3 pb-1">
            <div className="text-sm font-semibold text-white leading-snug break-words">{me?.orgName ?? summary?.site.name ?? ""}</div>
            <div className="text-[11px] text-white/50 break-all">{user.email}</div>
          </div>
          <button onClick={() => signOut(auth)} className="text-left text-xs text-white/60 px-3 py-1">ログアウト</button>
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


