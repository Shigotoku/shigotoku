import { Outlet, useNavigate } from "react-router-dom";
import {
  Inbox,
  Kanban,
  MessageSquarePlus,
  Settings,
  UserRound,
  LogOut,
  ScrollText,
  ChartColumn,
  Lightbulb,
  Map,
  CalendarRange,
  Trophy,
  Bot,
  Flame,
  Layers,
  Menu,
  BookOpen,
  Plug,
} from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import CaptureFab from "../components/CaptureFab";
import NotificationBell from "../components/NotificationBell";
import Hotkeys from "../components/Hotkeys";
import PwaInstallBanner from "../components/PwaInstallBanner";
import SidebarNav, { type NavGroup } from "../components/SidebarNav";
import MobileBottomNav from "../components/MobileBottomNav";
import MobileNavDrawer from "../components/MobileNavDrawer";
import { LANDING_URL } from "../lib/urls";
import { loadSettings, listPendingFeedback, runReminderSweep } from "../lib/demoStore";
import { loadFlags } from "../lib/featureFlags";
import { canCapture, canTriage, loadRole, type AppRole } from "../lib/roles";
import { t } from "../lib/i18n";
import { useLocale } from "../lib/useLocale";
import {
  fetchMyMemberProfile,
  fetchOrgProfile,
  mapOrgRoleToAppRole,
} from "../lib/org";
import {
  countUnreadWeeklyDigestRemote,
} from "../lib/cloudStore";
import { maybeEnsureWeeklyDigestOnLogin } from "../lib/weeklyDigestRunner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { publishAuthToExtension } from "../lib/extensionBridge";

export default function AppLayout() {
  const navigate = useNavigate();
  const { signOut, user, mode } = useAuth();
  const [localRole] = useState(() => loadRole());
  const [cloudRole, setCloudRole] = useState<AppRole | null>(null);
  const [flags, setFlags] = useState(() => loadFlags());
  const locale = useLocale();
  const [orgName, setOrgName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [digestBadge, setDigestBadge] = useState(0);

  const refreshDigestBadge = useCallback(async () => {
    try {
      const n = await countUnreadWeeklyDigestRemote();
      setDigestBadge(n);
    } catch {
      setDigestBadge(0);
    }
  }, []);

  const role = mode === "google" && cloudRole ? cloudRole : localRole;

  const refreshProfile = useCallback(async () => {
    if (mode === "demo") {
      const s = loadSettings();
      setOrgName(s.companyName?.trim() || "");
      setMemberName(s.displayName?.trim() || "");
      return;
    }
    if (mode !== "google" || !user) return;
    try {
      const [org, member] = await Promise.all([fetchOrgProfile(), fetchMyMemberProfile()]);
      setOrgName(org.name.trim());
      setMemberName(member.name.trim());
      setCloudRole(mapOrgRoleToAppRole(member.role));
    } catch {
      setOrgName("");
      setMemberName(user.displayName?.trim() || user.email?.split("@")[0] || "");
    }
  }, [mode, user]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (mode === "google" && user) void publishAuthToExtension(true);
  }, [mode, user]);

  useEffect(() => {
    const onOrg = () => void refreshProfile();
    window.addEventListener("shapeit-org", onOrg);
    return () => window.removeEventListener("shapeit-org", onOrg);
  }, [refreshProfile]);

  useEffect(() => {
    if (mode === "demo") runReminderSweep();
    const onFlags = () => setFlags(loadFlags());
    window.addEventListener("shapeit-flags", onFlags);
    const tick = window.setInterval(onFlags, 5000);
    return () => {
      window.removeEventListener("shapeit-flags", onFlags);
      window.clearInterval(tick);
    };
  }, [mode]);

  useEffect(() => {
    if (mode === "demo" || mode === "google") {
      void maybeEnsureWeeklyDigestOnLogin().then(() => refreshDigestBadge());
    }
  }, [mode, refreshDigestBadge]);

  useEffect(() => {
    void refreshDigestBadge();
    const onNotif = () => void refreshDigestBadge();
    window.addEventListener("shapeit-notifications", onNotif);
    const tick = window.setInterval(() => void refreshDigestBadge(), 60_000);
    return () => {
      window.removeEventListener("shapeit-notifications", onNotif);
      window.clearInterval(tick);
    };
  }, [refreshDigestBadge]);

  const slaBadge = useMemo(() => {
    if (mode !== "demo") return 0;
    const hours = loadSettings().triageSlaHours;
    return listPendingFeedback().filter(
      (f) => Date.now() - new Date(f.createdAt).getTime() > hours * 3600_000,
    ).length;
  }, [mode]);

  const displayName =
    memberName ||
    user?.displayName?.trim() ||
    (user?.email ? user.email.split("@")[0] : mode === "demo" ? t("demo_mode", locale) : "");

  const companyLabel = orgName || t("company_name_unset", locale);

  const navGroups: NavGroup[] = useMemo(() => {
    const main = [
      canCapture(role) && { to: "/capture", label: t("nav_capture", locale), icon: MessageSquarePlus },
      canTriage(role) && { to: "/inbox", label: t("nav_inbox", locale), icon: Inbox },
      { to: "/board", label: t("nav_board", locale), icon: Kanban },
      { to: "/fix-packs", label: t("nav_fix_packs", locale), icon: Layers },
    ].filter(Boolean) as NavGroup["items"][number][];

    const planning = [
      flags.ideas && { to: "/ideas", label: t("nav_ideas", locale), icon: Lightbulb },
      flags.roadmap && { to: "/roadmap", label: t("nav_roadmap", locale), icon: Map },
      flags.ranking && { to: "/ranking", label: t("nav_ranking", locale), icon: Trophy },
    ].filter(Boolean) as NavGroup["items"][number][];

    const analytics = [
      { to: "/ask", label: t("nav_ask", locale), icon: Bot },
      { to: "/heatmap", label: t("nav_heatmap", locale), icon: Flame },
      flags.insights && { to: "/insights", label: t("nav_insights", locale), icon: ChartColumn },
      flags.digest && {
        to: "/digest",
        label: t("nav_digest", locale),
        icon: CalendarRange,
        badge: digestBadge > 0 ? digestBadge : undefined,
      },
    ].filter(Boolean) as NavGroup["items"][number][];

    const account = [
      { to: "/my-feedback", label: t("nav_my", locale), icon: UserRound },
      { to: "/changelog", label: t("nav_changelog", locale), icon: ScrollText },
    ];

    return [
      { id: "main", collapsible: false, items: main },
      { id: "planning", labelKey: "nav_group_planning", items: planning },
      { id: "analytics", labelKey: "nav_group_analytics", items: analytics },
      { id: "account", labelKey: "nav_group_account", items: account },
    ];
  }, [role, flags, locale, digestBadge]);

  const doSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[188px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-mint focus:px-3 focus:py-2 focus:text-white"
      >
        {locale === "ja" ? "メインコンテンツへ" : "Skip to content"}
      </a>

      {/* モバイル上部バー */}
      <header
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-ink/10 bg-white/95 px-3 py-2 backdrop-blur-md lg:hidden"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <a href={LANDING_URL} className="flex min-w-0 items-center gap-1.5">
          <img src="/icon.png" alt="" className="h-8 w-8 rounded-md" width={32} height={32} />
          <span className="font-display truncate text-base font-semibold">ShapeIt</span>
        </a>
        {slaBadge > 0 && canTriage(role) && (
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-900">SLA {slaBadge}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell compact />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink/60 hover:bg-paper"
            aria-label="メニュー"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* デスクトップサイドバー */}
      <aside className="hidden h-screen flex-col border-r border-ink/10 bg-white lg:sticky lg:top-0 lg:flex lg:overflow-visible">
        <div className="px-2.5 py-2">
          <a href={LANDING_URL} className="flex items-center gap-1.5">
            <img src="/icon.png" alt="" className="h-7 w-7 rounded-md" width={28} height={28} />
            <span className="font-display text-base font-semibold">ShapeIt</span>
          </a>
        </div>

        {slaBadge > 0 && canTriage(role) && (
          <p className="mx-2 mb-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-900">
            SLA {slaBadge}
          </p>
        )}

        <nav className="flex-1 overflow-hidden">
          <SidebarNav groups={navGroups} />
        </nav>

        <div className="shrink-0 overflow-visible border-t border-ink/10 px-2 py-2">
          <a
            href={`${LANDING_URL}/setup/`}
            target="_blank"
            rel="noreferrer"
            className="mb-2 flex items-center gap-2 rounded-lg border border-ink/15 bg-ink/[0.04] px-2.5 py-2 text-[12px] font-bold text-ink shadow-sm transition-colors hover:border-ink/25 hover:bg-ink/[0.06]"
          >
            <Plug className="h-4 w-4 shrink-0 text-mint" aria-hidden />
            <span className="leading-tight">{t("nav_member_setup", locale)}</span>
          </a>
          <a
            href={`${LANDING_URL}/guide/`}
            target="_blank"
            rel="noreferrer"
            className="mb-2 flex items-center gap-2 rounded-lg border border-mint/25 bg-mint/10 px-2.5 py-2 text-[13px] font-bold text-mint shadow-sm transition-colors hover:border-mint/40 hover:bg-mint/15"
          >
            <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
            <span className="leading-tight">{t("nav_guide", locale)}</span>
          </a>
          <div className="min-w-0 px-1.5 pb-2 leading-snug">
            <p className="break-words text-[13px] font-bold text-ink" title={companyLabel}>
              {companyLabel}
            </p>
            <p className="mt-0.5 break-words text-[12px] font-medium text-ink/75" title={displayName}>
              {displayName}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <NotificationBell compact sidebar />
            <button
              type="button"
              title={t("settings", locale)}
              className="inline-flex h-10 w-full items-center justify-center rounded-lg text-ink/60 hover:bg-paper hover:text-ink"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              title={t("logout", locale)}
              className="inline-flex h-10 w-full items-center justify-center rounded-lg text-ink/60 hover:bg-paper hover:text-ink"
              onClick={() => void doSignOut()}
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      <main
        id="main"
        className="relative min-w-0 p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-4 lg:pb-6"
      >
        <Outlet />
      </main>

      <MobileBottomNav role={role} onOpenMore={() => setDrawerOpen(true)} />
      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={navGroups}
        companyLabel={companyLabel}
        displayName={displayName}
        guideUrl={`${LANDING_URL}/guide/`}
        setupGuideUrl={`${LANDING_URL}/setup/`}
        onSettings={() => navigate("/settings")}
        onSignOut={() => void doSignOut()}
      />

      {/* デスクトップのみ FAB（モバイルはボトムナビの投稿タブ） */}
      {canCapture(role) && (
        <div className="hidden lg:block">
          <CaptureFab />
        </div>
      )}
      <Hotkeys />
      <PwaInstallBanner />
    </div>
  );
}
