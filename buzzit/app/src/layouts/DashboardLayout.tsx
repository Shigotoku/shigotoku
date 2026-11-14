import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wand2,
  BarChart3,
  MessageCircle,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
  CalendarDays,
  Inbox,
  BookOpen,
  ChevronDown,
  Share2,
  Bot,
  CheckCircle2,
  PenLine,
} from 'lucide-react';
import { BRAND_NAME } from '../constants/brand';
import { landingPath } from '../lib/urls';
import { useApp } from '../store/appContext';
import { fetchSettings } from '../lib/api';
import type { PlanTier } from '../types';
import { useAuth } from '../store/authContext';
import { useStore } from '../store/storeContext';
import StoreSwitcher from '../components/StoreSwitcher';
import PersonaSwitcher from '../components/PersonaSwitcher';
import PwaInstallBanner from '../components/PwaInstallBanner';
import MobileBottomNav from '../components/MobileBottomNav';
import OnboardingTour from '../components/OnboardingTour';
import PersonaSelectGate from '../components/PersonaSelectGate';
import PersonaChangeToast from '../components/PersonaChangeToast';
import ActivePersonaContextBar from '../components/ActivePersonaContextBar';
import BrandMark from '../components/BrandMark';
import { ROLE_LABELS, canEditSettings, canManageLineCrm, isStaffOnly } from '../lib/permissions';
import { getPageMeta } from '../lib/pageMeta';
import { SNS_NAV_PLATFORMS, getSnsNavPlatform } from '../lib/snsPlatforms';

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
  /** このパス配下のときもアクティブ表示にする */
  match?: string[];
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
  { kind: 'link', name: '今日の投稿', path: '/today', icon: CheckCircle2, staffOk: true },
  { kind: 'divider', label: 'つくる' },
  { kind: 'link', name: 'ネタを溜める', path: '/inbox', icon: Inbox, staffOk: true },
  { kind: 'link', name: '投稿を作る', path: '/magic-creator', icon: Wand2, staffOk: true },
  { kind: 'link', name: 'まとめて作る', path: '/content-calendar', icon: PenLine, staffOk: true, match: ['/content-calendar', '/x-series'] },
  { kind: 'divider', label: '予約・確認' },
  { kind: 'link', name: '投稿カレンダー', path: '/calendar', icon: CalendarDays, staffOk: true },
  {
    kind: 'group',
    id: 'sns',
    name: 'SNSごとの管理',
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
  { kind: 'divider', label: '増やす' },
  { kind: 'link', name: '集客（LINE・導線）', path: '/line-crm', icon: MessageCircle, managerOnly: true, match: ['/line-crm', '/funnel'] },
  { kind: 'link', name: '分析・売上', path: '/analytics', icon: BarChart3, managerOnly: true },
  { kind: 'divider', label: '設定・ヘルプ' },
  { kind: 'link', name: 'AI連携（ChatGPT等）', path: '/settings?tab=personas', icon: Bot, managerOnly: true },
  { kind: 'link', name: '設定', path: '/settings', icon: Settings, managerOnly: true },
  { kind: 'link', name: '使い方の手順', path: '/guide', icon: BookOpen, staffOk: true, match: ['/guide', '/roadmap'] },
];

/** サイドバー1項目に対応する複数ページを、ページ上部のタブで切り替える */
const SECTION_TABS: Record<string, Array<{ path: string; label: string }>> = {
  bulk: [
    { path: '/content-calendar', label: '30日分をまとめて作る' },
    { path: '/x-series', label: 'Xシリーズ（自動投稿キュー）' },
  ],
  growth: [
    { path: '/line-crm', label: 'LINE CRM（友だち管理）' },
    { path: '/funnel', label: '導線ビルダー（SNS→LINE→予約）' },
  ],
  help: [
    { path: '/guide', label: '使い方の手順' },
    { path: '/roadmap', label: '成長ロードマップ' },
  ],
};

function SectionTabs({ pathname }: { pathname: string }) {
  const tabs = Object.values(SECTION_TABS).find((g) => g.some((t) => pathname.startsWith(t.path)));
  if (!tabs) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-neutral-200">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.path);
        return (
          <NavLink
            key={t.path}
            to={t.path}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              active ? 'border-violet-600 text-violet-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t.label}
          </NavLink>
        );
      })}
    </div>
  );
}

function dropEmptyDividers(list: NavEntry[]): NavEntry[] {
  return list.filter((e, i) => e.kind !== 'divider' || (list[i + 1] !== undefined && list[i + 1].kind !== 'divider'));
}

function filterNav(entries: NavEntry[], staffOnly: boolean): NavEntry[] {
  return dropEmptyDividers(filterNavRaw(entries, staffOnly));
}

function filterNavRaw(entries: NavEntry[], staffOnly: boolean): NavEntry[] {
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
    sns: false,
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
      <div className="flex h-12 shrink-0 items-center border-b border-white/10 px-3 lg:h-14 lg:px-4">
        <div className="flex items-center gap-2">
          <BrandMark className="buzz-logo-mark !h-7 !w-7" size={28} />
          <span className="font-display text-base font-bold tracking-tight text-white">{BRAND_NAME}</span>
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
                  className={`buzz-nav-group-btn ${groupActive ? 'text-white' : ''}`}
                  aria-expanded={open}
                >
                  <entry.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 text-left">{entry.name}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>
                {open && (
                  <div className="mb-1 ml-2 space-y-0.5 border-l border-white/10 pl-2">
                    {entry.children.map((child) => {
                      const platform = SNS_NAV_PLATFORMS.find((p) => child.path === `/sns/${p.id}`);
                      return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          `buzz-nav-link ${isActive ? 'buzz-nav-link-active' : 'buzz-nav-link-inactive'}`
                        }
                      >
                        {platform && (
                          <span
                            className="buzz-nav-platform-dot"
                            style={{ backgroundColor: platform.brandColor }}
                            aria-hidden
                          />
                        )}
                        {child.name}
                      </NavLink>
                    );})}
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
              className={({ isActive }) => {
                const aiTab = location.pathname === '/settings' && location.search.includes('tab=personas');
                const on = entry.path.includes('tab=personas')
                  ? aiTab
                  : entry.path === '/settings'
                    ? location.pathname === '/settings' && !aiTab
                    : isActive || !!entry.match?.some((m) => location.pathname.startsWith(m));
                return `buzz-nav-link ${on ? 'buzz-nav-link-active' : 'buzz-nav-link-inactive'}`;
              }}
            >
              <entry.icon className="h-4 w-4 shrink-0" />
              {entry.name}
            </NavLink>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-1.5 border-t border-white/10 px-2.5 py-2">
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          <a
            href={landingPath('/')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline-offset-2 hover:text-white hover:underline"
          >
            サイト
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] font-bold text-white">
            {displayName.slice(0, 1)}
          </div>
          <p
            className="min-w-0 flex-1 truncate text-[11px] text-neutral-400"
            title={`${displayName} · ${roleLabel} (${planLabels[plan]})`}
          >
            <span className="font-medium text-neutral-200">{displayName}</span>
            <span className="text-neutral-500"> · {roleLabel}</span>
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
            title="ログアウト"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { plan, setPlan } = useApp();
  const { user, logout } = useAuth();
  const { userRole, refreshStores } = useStore();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const displayName = user?.displayName ?? user?.email ?? 'デモユーザー';
  const pageMeta = getPageMeta(location.pathname);
  const title = pageMeta.title;
  const snsPlatform = location.pathname.startsWith('/sns/')
    ? getSnsNavPlatform(location.pathname.split('/')[2] ?? '')
    : undefined;
  const isSns = !!snsPlatform;
  const isFullPage = isSns || location.pathname === '/dashboard';
  const roleLabel = userRole ? ROLE_LABELS[userRole] : 'メンバー';

  const navEntries = useMemo(() => filterNav(mainNav, isStaffOnly(userRole)), [userRole]);

  useEffect(() => {
    refreshStores().catch(() => {});
  }, [refreshStores]);

  useEffect(() => {
    fetchSettings()
      .then((s) => setPlan((s.devFullAccess ? 'enterprise' : s.plan) as PlanTier))
      .catch(() => {});
  }, [setPlan]);

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
      return <Navigate to="/inbox" replace state={{ denied: true }} />;
    }
    if (location.pathname.startsWith('/line-crm') && !canManageLineCrm(userRole)) {
      return <Navigate to="/inbox" replace state={{ denied: true }} />;
    }
    if (location.pathname.startsWith('/funnel') || location.pathname.startsWith('/analytics')) {
      return <Navigate to="/inbox" replace state={{ denied: true }} />;
    }
  }

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[var(--color-buzz-paper)] text-neutral-900">
      {navOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-neutral-900/40 lg:hidden"
          aria-label="メニューを閉じる"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`buzz-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(100vw-3rem,18rem)] shrink-0 flex-col border-r transition-transform duration-200 lg:static lg:z-auto lg:h-dvh lg:w-64 lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          className="absolute right-3 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-neutral-400 hover:bg-white/10 hover:text-white lg:hidden"
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
        <header
          className={`relative z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b px-4 py-2 lg:min-h-14 ${
            isSns ? 'border-transparent lg:px-4' : 'border-neutral-200/80 bg-white/95 backdrop-blur-sm lg:min-h-16 lg:px-8'
          }`}
          style={isSns ? { background: snsPlatform?.brandGradient } : undefined}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg lg:hidden ${
                isSns ? 'text-white hover:bg-white/15' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
              aria-label="メニューを開く"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className={`truncate text-base font-semibold lg:text-xl ${isSns ? 'text-white' : 'text-neutral-900 lg:text-lg'}`}>
                {title}
              </h1>
              {pageMeta.subtitle && (
                <p className="hidden truncate text-xs text-neutral-500 sm:block">{pageMeta.subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ActivePersonaContextBar />
            <PersonaSwitcher />
            <StoreSwitcher />
          </div>
        </header>
        <div
          className={`relative z-0 flex-1 ${
            isFullPage
              ? 'flex flex-col overflow-auto p-3 pb-24 lg:overflow-hidden lg:p-3 lg:pb-3'
              : 'overflow-auto p-4 pb-24 md:p-6 lg:p-8 lg:pb-8'
          }`}
        >
          {(location.state as { denied?: boolean } | null)?.denied && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              そのページはスタッフ権限では開けません。オーナー・マネージャーにご相談ください。
            </p>
          )}
          <SectionTabs pathname={location.pathname} />
          <Outlet />
        </div>
        <MobileBottomNav onOpenMenu={() => setNavOpen(true)} />
        <PersonaSelectGate />
        <PersonaChangeToast />
        <OnboardingTour />
        <PwaInstallBanner />
      </main>
    </div>
  );
}
