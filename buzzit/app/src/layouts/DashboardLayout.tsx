import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wand2,
  BarChart3,
  MessageCircle,
  Settings,
  Bell,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Map,
  CalendarDays,
  Inbox,
  Route,
  CalendarRange,
  BookOpen,
  Layers,
  ChevronDown,
  Share2,
  PenLine,
} from 'lucide-react';
import { BRAND_NAME } from '../constants/brand';
import { landingPath } from '../lib/urls';
import { useApp } from '../store/appContext';
import { useAuth } from '../store/authContext';
import { useStore } from '../store/storeContext';
import StoreSwitcher from '../components/StoreSwitcher';
import PwaInstallBanner from '../components/PwaInstallBanner';
import BrandMark from '../components/BrandMark';
import { ROLE_LABELS, canEditSettings, canManageLineCrm, isStaffOnly } from '../lib/permissions';
import { getPageMeta } from '../lib/pageMeta';
import { SNS_NAV_PLATFORMS } from '../lib/snsPlatforms';

const planLabels = {
  free: 'Free',
  line_lite: 'LINE CRM Lite',
  line_pro: 'LINE CRM Pro',
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
  growth: 'Growth OS',
  enterprise: 'Enterprise',
} as const;

type IconType = ComponentType<{ className?: string }>;

type NavLinkItem = {
  kind: 'link';
  name: string;
  path: string;
  icon: IconType;
  staffOk?: boolean;
  managerOnly?: boolean;
};

type NavGroupItem = {
  kind: 'group';
  id: string;
  name: string;
  icon: IconType;
  children: NavLinkItem[];
  staffOk?: boolean;
  managerOnly?: boolean;
};

type NavDivider = {
  kind: 'divider';
  label: string;
};

type NavEntry = NavLinkItem | NavGroupItem | NavDivider;

const mainNav: NavEntry[] = [
  { kind: 'link', name: 'ダッシュボード', path: '/dashboard', icon: LayoutDashboard, staffOk: true },
  {
    kind: 'group',
    id: 'ideas',
    name: 'ネタ作成',
    icon: PenLine,
    staffOk: true,
    children: [
      { kind: 'link', name: 'ネタInbox', path: '/inbox', icon: Inbox, staffOk: true },
      { kind: 'link', name: 'ネタクリエイター', path: '/magic-creator', icon: Wand2, staffOk: true },
    ],
  },
  {
    kind: 'group',
    id: 'sns',
    name: 'SNS',
    icon: Share2,
    staffOk: true,
    children: SNS_NAV_PLATFORMS.map((p) => ({
      kind: 'link' as const,
      name: p.name,
      path: `/sns/${p.id}`,
      icon: Share2,
      staffOk: true,
    })),
  },
  { kind: 'link', name: '投稿カレンダー', path: '/calendar', icon: CalendarDays, staffOk: true },
  { kind: 'link', name: '導線ビルダー', path: '/funnel', icon: Route, managerOnly: true },
  { kind: 'link', name: 'LINE CRM', path: '/line-crm', icon: MessageCircle, managerOnly: true },
  { kind: 'link', name: '設定', path: '/settings', icon: Settings, managerOnly: true },
  { kind: 'divider', label: 'その他の機能' },
  { kind: 'link', name: '成長ロードマップ', path: '/roadmap', icon: Map, staffOk: true },
  { kind: 'link', name: '30本カレンダー', path: '/content-calendar', icon: CalendarRange, staffOk: true },
  { kind: 'link', name: 'Xシリーズ', path: '/x-series', icon: Layers, staffOk: true },
  { kind: 'link', name: '分析・売上', path: '/analytics', icon: BarChart3, managerOnly: true },
];

function filterNav(entries: NavEntry[], staffOnly: boolean): NavEntry[] {
  const out: NavEntry[] = [];
  for (const entry of entries) {
    if (entry.kind === 'divider') {
      if (out.some((e) => e.kind !== 'divider')) out.push(entry);
      continue;
    }
    if (staffOnly) {
      if (entry.kind === 'link') {
        if (entry.staffOk) out.push(entry);
      } else {
        const children = entry.children.filter((c) => c.staffOk);
        if (children.length > 0 && entry.staffOk !== false) {
          out.push({ ...entry, children });
        }
      }
      continue;
    }
    if (entry.kind === 'link') {
      out.push(entry);
    } else {
      out.push(entry);
    }
  }
  // 末尾の divider だけなら除去
  while (out.length > 0 && out[out.length - 1]?.kind === 'divider') out.pop();
  // divider の直後が無い場合も除去
  return out.filter((e, i, arr) => {
    if (e.kind !== 'divider') return true;
    const next = arr[i + 1];
    return next != null && next.kind !== 'divider';
  });
}

function pathInGroup(pathname: string, group: NavGroupItem) {
  return group.children.some((c) => pathname === c.path || pathname.startsWith(`${c.path}/`));
}

function SidebarContent({
  displayName,
  plan,
  roleLabel,
  navEntries,
  onNavigate,
  onLogout,
}: {
  displayName: string;
  plan: keyof typeof planLabels;
  roleLabel: string;
  navEntries: NavEntry[];
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    ideas: true,
    sns: true,
  }));

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const entry of navEntries) {
        if (entry.kind === 'group' && pathInGroup(location.pathname, entry)) {
          next[entry.id] = true;
        }
      }
      return next;
    });
  }, [location.pathname, navEntries]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center border-b border-neutral-200 px-3 lg:h-14 lg:px-4">
        <div className="flex items-center gap-2">
          <BrandMark className="buzz-logo-mark !h-7 !w-7" size={28} />
          <span className="font-display text-base font-bold tracking-tight">{BRAND_NAME}</span>
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-2">
        {navEntries.map((entry) => {
          if (entry.kind === 'divider') {
            return (
              <div key={entry.label} className="buzz-nav-divider">
                {entry.label}
              </div>
            );
          }
          if (entry.kind === 'group') {
            const open = openGroups[entry.id] ?? false;
            const groupActive = pathInGroup(location.pathname, entry);
            return (
              <div key={entry.id} className="pt-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.id)}
                  className={`buzz-nav-group-btn ${groupActive ? 'text-neutral-900' : ''}`}
                  aria-expanded={open}
                >
                  <entry.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 text-left">{entry.name}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>
                {open && (
                  <div className="mb-1 ml-2 space-y-0.5 border-l border-neutral-200 pl-2">
                    {entry.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          `buzz-nav-link ${isActive ? 'buzz-nav-link-active' : 'buzz-nav-link-inactive'}`
                        }
                      >
                        {child.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={entry.path}
              to={entry.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `buzz-nav-link ${isActive ? 'buzz-nav-link-active' : 'buzz-nav-link-inactive'}`
              }
            >
              <entry.icon className="h-4 w-4 shrink-0" />
              {entry.name}
            </NavLink>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-1.5 border-t border-neutral-200 bg-[#f5f4f0] px-2.5 py-2">
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          <NavLink
            to="/onboarding?edit=1"
            onClick={onNavigate}
            className="underline-offset-2 hover:text-neutral-900 hover:underline"
            title="業種・目的の見直し"
          >
            はじめに
          </NavLink>
          <span className="text-neutral-300">|</span>
          <a
            href={landingPath('/')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            サイト
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-[10px] font-bold text-neutral-700">
            {displayName.slice(0, 1)}
          </div>
          <p
            className="min-w-0 flex-1 truncate text-[11px] text-neutral-700"
            title={`${displayName} · ${roleLabel} (${planLabels[plan]})`}
          >
            <span className="font-medium text-neutral-900">{displayName}</span>
            <span className="text-neutral-400"> · {roleLabel}</span>
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-white hover:text-neutral-900"
            title="ログアウト"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
        <a
          href={landingPath('/guide/')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-full items-center justify-center gap-1.5 bg-neutral-900 text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          使い方説明書
          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
        </a>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { plan } = useApp();
  const { user, logout } = useAuth();
  const { userRole, refreshStores } = useStore();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const displayName = user?.displayName ?? user?.email ?? 'デモユーザー';
  const pageMeta = getPageMeta(location.pathname);
  const title = pageMeta.title;
  const roleLabel = userRole ? ROLE_LABELS[userRole] : 'メンバー';

  const navEntries = useMemo(() => filterNav(mainNav, isStaffOnly(userRole)), [userRole]);

  useEffect(() => {
    refreshStores().catch(() => {});
  }, [refreshStores]);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [navOpen]);

  if (isStaffOnly(userRole)) {
    if (location.pathname.startsWith('/settings') && !canEditSettings(userRole)) {
      return <Navigate to="/inbox" replace />;
    }
    if (location.pathname.startsWith('/line-crm') && !canManageLineCrm(userRole)) {
      return <Navigate to="/inbox" replace />;
    }
    if (location.pathname.startsWith('/funnel') || location.pathname.startsWith('/analytics')) {
      return <Navigate to="/inbox" replace />;
    }
  }

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[#f5f4f0] text-neutral-900">
      {navOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-neutral-900/40 lg:hidden"
          aria-label="メニューを閉じる"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(100vw-3rem,18rem)] shrink-0 flex-col border-r border-neutral-200 bg-[#f5f4f0] transition-transform duration-200 lg:static lg:z-auto lg:h-dvh lg:w-64 lg:translate-x-0 ${
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
          roleLabel={roleLabel}
          navEntries={navEntries}
          onNavigate={() => setNavOpen(false)}
          onLogout={() => logout()}
        />
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-10 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-[#f5f4f0]/95 px-4 py-2 lg:min-h-16 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded text-neutral-600 hover:bg-white lg:hidden"
              aria-label="メニューを開く"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-neutral-900 lg:text-lg">{title}</h1>
              {pageMeta.subtitle && (
                <p className="hidden truncate text-xs text-neutral-500 sm:block">{pageMeta.subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StoreSwitcher />
            <button
              type="button"
              className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white hover:text-neutral-900"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-neutral-900" />
            </button>
          </div>
        </header>
        <div className="relative z-10 flex-1 overflow-auto p-4 pb-24 md:p-6 lg:p-8 lg:pb-8">
          <Outlet />
        </div>
        <PwaInstallBanner />
      </main>
    </div>
  );
}
