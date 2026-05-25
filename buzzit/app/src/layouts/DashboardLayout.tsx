import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Wand2, BarChart3, Settings, Bell, ExternalLink, LogOut } from 'lucide-react';
import { BRAND_NAME } from '../constants/brand';
import { landingPath } from '../lib/urls';
import { useApp } from '../store/appContext';
import { useAuth } from '../store/authContext';

const planLabels = {
  starter: 'Starter (無料)',
  pro: 'Pro',
  team: 'Team',
  growth: 'Growth OS',
} as const;

export default function DashboardLayout() {
  const { plan } = useApp();
  const { user, logout } = useAuth();
  const displayName = user?.displayName ?? user?.email ?? 'デモユーザー';

  const navItems = [
    { name: '経営コクピット', path: '/dashboard', icon: LayoutDashboard },
    { name: 'マジック・クリエイター', path: '/magic-creator', icon: Wand2 },
    { name: '分析・売上', path: '/analytics', icon: BarChart3 },
    { name: '設定', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-50 font-['Inter']">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg">B</div>
            <span className="text-xl font-bold font-['Outfit'] tracking-wide">{BRAND_NAME}</span>          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-3">
          <a
            href={landingPath('/')}
            className="flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-indigo-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            サービスサイトへ
          </a>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-sm font-bold text-indigo-300">
              {displayName.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-slate-500">Owner ({planLabels[plan]})</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
              title="ログアウト"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none"></div>
        <header className="h-20 flex items-center justify-between px-8 border-b border-slate-800/50 z-10 relative">
          <h2 className="text-xl font-semibold">Welcome back</h2>
          <button className="relative p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"></span>
          </button>
        </header>
        <div className="flex-1 overflow-auto p-8 z-10 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
