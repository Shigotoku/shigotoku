import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, FilePlus2, LayoutTemplate, Users, Settings, LogOut, ExternalLink } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { signOutUser } from "../lib/firebase";
import { landingPath } from "../lib/urls";
import { useOrg } from "../context/OrgContext";

const nav = [
  { to: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { to: "/manuals/new", label: "新しく作る", icon: FilePlus2 },
  { to: "/templates", label: "テンプレート", icon: LayoutTemplate },
  { to: "/team", label: "スタッフ", icon: Users },
  { to: "/settings", label: "設定", icon: Settings },
];

export default function AppLayout() {
  const { user, demoMode } = useAuth();
  const { error: orgError, loading: orgLoading } = useOrg();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (!demoMode) await signOutUser();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="clipit-icon-frame h-9 w-9 shrink-0">
            <img src="/icon.png" alt="クリッピット" className="clipit-brand-icon h-full w-full object-contain" />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900">クリッピット</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon className="h-4.5 w-4.5" size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <a
            href={landingPath("/")}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            <ExternalLink size={18} />
            サービスサイトへ
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            <LogOut size={18} />
            ログアウト
          </button>
          <p className="mt-2 truncate px-3 text-xs text-slate-400">
            {demoMode ? "デモモード" : user?.email ?? ""}
          </p>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        {nav.slice(0, 4).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
                isActive ? "text-primary-600" : "text-slate-500"
              }`
            }
          >
            <Icon size={20} />
            {label.replace("ダッシュボード", "ホーム").replace("新しく作る", "作成")}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 overflow-x-clip pb-16 md:pb-0">
        {orgError && (
          <div className="border-b border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700">{orgError}</div>
        )}
        {orgLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
