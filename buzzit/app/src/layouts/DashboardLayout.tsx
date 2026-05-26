import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wand2, BarChart3, MessageCircle, Settings, Bell, ExternalLink, LogOut, Menu, X } from 'lucide-react';
import { BRAND_NAME } from '../constants/brand';
import { landingPath } from '../lib/urls';
import { useApp } from '../store/appContext';
import { useAuth } from '../store/authContext';

const planLabels = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
  growth: 'Growth OS',
  enterprise: 'Enterprise',
} as const;

const navItems = [
  { name: '経営コクピット', path: '/dashboard', icon: LayoutDashboard },
  { name: 'マジック・クリエイター', path: '/magic-creator', icon: Wand2 },
  { name: 'LINE CRM', path: '/line-crm', icon: MessageCircle },
  { name: '分析・売上', path: '/analytics', icon: BarChart3 },
  { name: '設定', path: '/settings', icon: Settings },
];

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/magic-creator')) return 'マジック・クリエイター';
  if (pathname.startsWith('/line-crm')) return 'LINE CRM';
  if (pathname.startsWith('/analytics')) return '分析・売上';
  if (pathname.startsWith('/settings')) return '設定';
  return '経営コクピット';
}

function SidebarContent({
  displayName,
  plan,
  onNavigate,
  onLogout,
}: {
  displayName: string;
  plan: keyof typeof planLabels;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center border-b border-neutral-200 px-5 lg:h-20 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="buzz-logo-mark text-base">B</span>
          <span className="font-display text-xl font-bold tracking-tight">{BRAND_NAME}</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `buzz-nav-link ${isActive ? 'buzz-nav-link-active' : 'buzz-nav-link-inactive'}`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-3 border-t border-neutral-200 p-4">
        <a
          href={landingPath('/')}
          className="flex min-h-[44px] items-center gap-2 text-xs text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          サービスサイトへ
        </a>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-300 bg-white text-sm font-bold text-neutral-700">
            {displayName.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="text-xs text-neutral-500">Owner ({planLabels[plan]})</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-neutral-500 transition-colors hover:bg-white hover:text-neutral-900"
            title="ログアウト"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout() {
  const { plan } = useApp();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const displayName = user?.displayName ?? user?.email ?? 'デモユーザー';
  const title = pageTitle(location.pathname);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [navOpen]);

  return (
    <div className="flex min-h-dvh bg-[#f5f4f0] text-neutral-900">
      {navOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-neutral-900/40 lg:hidden"
          aria-label="メニューを閉じる"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col border-r border-neutral-200 bg-[#f5f4f0] transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          className="absolute right-3 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-neutral-500 hover:bg-white lg:hidden"
          aria-label="メニューを閉じる"
          onClick={() => setNavOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent
          displayName={displayName}
          plan={plan}
          onNavigate={() => setNavOpen(false)}
          onLogout={() => logout()}
        />
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-[#f5f4f0]/95 px-4 lg:h-20 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-neutral-600 hover:bg-white lg:hidden"
              aria-label="メニューを開く"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="truncate text-base font-semibold text-neutral-800 lg:text-lg">{title}</h2>
          </div>
          <button
            type="button"
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white hover:text-neutral-900"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-neutral-900" />
          </button>
        </header>
        <div className="relative z-10 flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
