import { Outlet, useNavigate } from "react-router-dom";
import {
  Inbox,
  Kanban,
  MessageSquarePlus,
  Settings,
  UserRound,
  LogOut,
  Puzzle,
  ScrollText,
  ChartColumn,
  Lightbulb,
  Map,
  CalendarRange,
  Rocket,
  Trophy,
  Shield,
  Plug,
  Bot,
  Flame,
  Layers,
  FlaskConical,
  Scale,
  Menu,
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
import { getLocale, t } from "../lib/i18n";
import {
  fetchMyMemberProfile,
  fetchOrgProfile,
  mapOrgRoleToAppRole,
} from "../lib/org";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function AppLayout() {
  const navigate = useNavigate();
  const { signOut, user, mode } = useAuth();
  const [localRole] = useState(() => loadRole());
  const [cloudRole, setCloudRole] = useState<AppRole | null>(null);
  const [flags, setFlags] = useState(() => loadFlags());
  const [locale, setLocale] = useState(getLocale());
  const [orgName, setOrgName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    const onLocale = () => setLocale(getLocale());
    const onOrg = () => void refreshProfile();
    window.addEventListener("shapeit-locale", onLocale);
    window.addEventListener("shapeit-org", onOrg);
    return () => {
      window.removeEventListener("shapeit-locale", onLocale);
      window.removeEventListener("shapeit-org", onOrg);
    };
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
    const workspace = [
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
      flags.digest && { to: "/digest", label: t("nav_digest", locale), icon: CalendarRange },
    ].filter(Boolean) as NavGroup["items"][number][];

    const account = [
      { to: "/my-feedback", label: t("nav_my", locale), icon: UserRound },
      { to: "/changelog", label: t("nav_changelog", locale), icon: ScrollText },
    ];

    const admin = [
      { to: "/golden", label: t("nav_golden", locale), icon: FlaskConical },
      { to: "/legal", label: t("nav_legal", locale), icon: Scale },
      { to: "/audit", label: t("nav_audit", locale), icon: Shield },
      flags.webhooks && { to: "/integrations", label: t("nav_integrations", locale), icon: Plug },
      { to: "/onboarding", label: t("nav_setup", locale), icon: Rocket },
      { to: "/extension/install", label: t("nav_extension", locale), icon: Puzzle },
    ].filter(Boolean) as NavGroup["items"][number][];

    return [
      { id: "workspace", labelKey: "nav_group_workspace", items: workspace },
      { id: "planning", labelKey: "nav_group_planning", items: planning },
      { id: "analytics", labelKey: "nav_group_analytics", items: analytics },
      { id: "account", labelKey: "nav_group_account", items: account },
      { id: "admin", labelKey: "nav_group_admin", items: admin },
    ];
  }, [role, flags, locale]);

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
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-[11px] font-bold text-mint-bright">
            S
          </span>
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
      <aside className="hidden h-screen flex-col border-r border-ink/10 bg-white lg:sticky lg:top-0 lg:flex">
        <div className="px-2.5 py-2">
          <a href={LANDING_URL} className="flex items-center gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[10px] font-bold text-mint-bright">
              S
            </span>
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

        <div className="shrink-0 border-t border-ink/10 px-2 py-2">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[10px] font-semibold text-ink">{companyLabel}</p>
              <p className="truncate text-[11px] text-ink/70">{displayName}</p>
            </div>
            <NotificationBell compact />
            <button
              type="button"
              title={t("settings", locale)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink/55 hover:bg-paper hover:text-ink"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              title={t("logout", locale)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink/55 hover:bg-paper hover:text-ink"
              onClick={() => void doSignOut()}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
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
