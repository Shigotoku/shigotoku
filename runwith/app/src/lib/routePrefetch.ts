import type { ComponentType } from 'react';

type RouteLoader = () => Promise<{ default: ComponentType<unknown> }>;

/** ルートごとの dynamic import（App.tsx の lazy と共有） */
export const routeLoaders: Record<string, RouteLoader> = {
  '/dashboard': () => import('../pages/dashboard/DashboardPage'),
  '/journey': () => import('../pages/journey/JourneyPage'),
  '/journey/business-idea': () => import('../features/idea-tools/pages/BusinessIdeaPage'),
  '/journey/market-size': () => import('../features/idea-tools/pages/MarketSizePage'),
  '/journey/competitor-analysis': () => import('../features/idea-tools/pages/CompetitorAnalysisPage'),
  '/journey/persona': () => import('../features/idea-tools/pages/PersonaPage'),
  '/journey/bmc': () => import('../features/idea-tools/pages/BmcPage'),
  '/journey/pharma-check': () => import('../features/idea-tools/pages/PharmaCheckPage'),
  '/journey/company-basics': () => import('../features/incorporation/pages/CompanyBasicsPage'),
  '/journey/post-registration': () => import('../features/incorporation/pages/PostRegistrationPage'),
  '/journey/mvp': () => import('../features/seed/pages/MvpPage'),
  '/journey/first-customers': () => import('../features/seed/pages/FirstCustomersPage'),
  '/journey/customer-interview': () => import('../features/seed/pages/CustomerInterviewPage'),
  '/company/setup': () => import('../pages/auth/CompanySetupPage'),
  '/company/new': () => import('../pages/auth/NewCompanyPage'),
  '/naming': () => import('../features/naming/pages/TrademarkGuidePage'),
  '/naming/generate': () => import('../features/naming/pages/NamingPage'),
  '/naming/category': () => import('../features/naming/pages/CategorySelectPage'),
  '/naming/checklist': () => import('../features/naming/pages/ChecklistPage'),
  '/naming/cost': () => import('../features/naming/pages/CostSimulatorPage'),
  '/naming/monitoring': () => import('../features/naming/pages/MonitoringPage'),
  '/incorporation': () => import('../features/incorporation/pages/IncorporationPage'),
  '/notifications': () => import('../features/notifications/pages/NotificationsPage'),
  '/bank': () => import('../features/bank/pages/BankGuidePage'),
  '/credit': () => import('../features/credit/pages/CreditGuidePage'),
  '/contracts': () => import('../features/contracts/pages/ContractsPage'),
  '/tax-calendar': () => import('../features/tax/pages/TaxCalendarPage'),
  '/labor': () => import('../features/labor/pages/LaborGuidePage'),
  '/funding': () => import('../features/funding/pages/FundingSearchPage'),
  '/simulator': () => import('../features/simulator/pages/SimulatorPage'),
  '/kpi-tracker': () => import('../features/kpi/pages/KpiTrackerPage'),
  '/ip-management': () => import('../features/ip/pages/IpManagementPage'),
  '/pitch': () => import('../features/pitch/pages/PitchDeckPage'),
  '/pitch-practice': () => import('../features/pitch/pages/PitchPracticePage'),
  '/investor': () => import('../features/investor/pages/InvestorMatchPage'),
  '/team': () => import('../features/team/pages/TeamPage'),
  '/team/invite': () => import('../pages/team/InvitePage'),
  '/dd-preparation': () => import('../features/dd/pages/DdPreparationPage'),
  '/ipo-roadmap': () => import('../features/ipo/pages/IpoRoadmapPage'),
  '/marketing': () => import('../features/marketing/pages/MarketingPage'),
  '/business-plan': () => import('../features/business-plan/pages/BusinessPlanPage'),
  '/community': () => import('../features/community/pages/CommunityPage'),
  '/settings': () => import('../pages/settings/SettingsPage'),
  '/admin': () => import('../pages/admin/AdminDashboardPage'),
  '/admin/users': () => import('../pages/admin/AdminUsersPage'),
  '/admin/leads': () => import('../pages/admin/AdminLeadsPage'),
};

/** サイドバー等でよく使うルート（ログイン後に先読み） */
export const NAV_ROUTE_PATHS = [
  '/dashboard',
  '/journey',
  '/naming/generate',
  '/naming',
  '/incorporation',
  '/journey/post-registration',
  '/notifications',
  '/bank',
  '/credit',
  '/labor',
  '/contracts',
  '/tax-calendar',
  '/simulator',
  '/funding',
  '/business-plan',
  '/ip-management',
  '/kpi-tracker',
  '/marketing',
  '/pitch',
  '/pitch-practice',
  '/investor',
  '/team',
  '/team/invite',
  '/settings',
  '/community',
];

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  const normalized = path.split('?')[0] ?? path;
  const loader = routeLoaders[normalized];
  if (!loader || prefetched.has(normalized)) return;
  prefetched.add(normalized);
  void loader();
}

export function prefetchNavRoutes(paths: string[] = NAV_ROUTE_PATHS) {
  const run = () => paths.forEach((path) => prefetchRoute(path));
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 800);
  }
}
