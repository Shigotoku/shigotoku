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
    <div className="flex h-screen bg-[#f5f4f0] text-neutral-900">
      <aside className="flex w-64 flex-col border-r border-neutral-200 bg-[#f5f4f0]">
        <div className="flex h-20 items-center border-b border-neutral-200 px-6">
          <div className="flex items-center gap-3">
            <span className="buzz-logo-mark text-base">B</span>
            <span className="font-display text-xl font-bold tracking-tight">{BRAND_NAME}</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `buzz-nav-link ${isActive ? 'buzz-nav-link-active' : 'buzz-nav-link-inactive'}`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-neutral-200 p-4">
          <a
            href={landingPath('/')}
            className="flex items-center gap-2 text-xs text-neutral-500 transition-colors hover:text-neutral-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            サービスサイトへ
          </a>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-neutral-300 bg-white text-sm font-bold text-neutral-700">
              {displayName.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="text-xs text-neutral-500">Owner ({planLabels[plan]})</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded p-2 text-neutral-500 transition-colors hover:bg-white hover:text-neutral-900"
              title="ログアウト"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <header className="relative z-10 flex h-20 items-center justify-between border-b border-neutral-200 bg-[#f5f4f0]/95 px-8">
          <h2 className="text-lg font-semibold text-neutral-800">ダッシュボード</h2>
          <button
            type="button"
            className="relative rounded-full p-2 text-neutral-500 transition-colors hover:bg-white hover:text-neutral-900"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-neutral-900" />
          </button>
        </header>
        <div className="relative z-10 flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
