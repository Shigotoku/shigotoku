import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import PageLoader from "./components/PageLoader";
import { routeLoaders } from "./lib/routePrefetch";

function L({ C }: { C: React.LazyExoticComponent<React.ComponentType<any>> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <C />
    </Suspense>
  );
}

const AdminDashboardPage = lazy(routeLoaders['/admin']!);
const AdminUsersPage = lazy(routeLoaders['/admin/users']!);
const AdminLeadsPage = lazy(routeLoaders['/admin/leads']!);

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const UpdatePasswordPage = lazy(() => import("./pages/auth/UpdatePasswordPage"));
const AcceptInvitePage = lazy(() => import("./pages/auth/AcceptInvitePage"));

const DashboardPage = lazy(routeLoaders['/dashboard']!);
const JourneyPage = lazy(routeLoaders['/journey']!);
const CompanySetupPage = lazy(routeLoaders['/company/setup']!);
const NewCompanyPage = lazy(routeLoaders['/company/new']!);
const SettingsPage = lazy(routeLoaders['/settings']!);
const InvitePage = lazy(routeLoaders['/team/invite']!);

const NamingPage = lazy(routeLoaders['/naming/generate']!);
const TrademarkGuidePage = lazy(routeLoaders['/naming']!);
const CategorySelectPage = lazy(routeLoaders['/naming/category']!);
const ChecklistPage = lazy(routeLoaders['/naming/checklist']!);
const CostSimulatorPage = lazy(routeLoaders['/naming/cost']!);
const MonitoringPage = lazy(routeLoaders['/naming/monitoring']!);

const BusinessIdeaPage = lazy(routeLoaders['/journey/business-idea']!);
const MarketSizePage = lazy(routeLoaders['/journey/market-size']!);
const CompetitorAnalysisPage = lazy(routeLoaders['/journey/competitor-analysis']!);
const PersonaPage = lazy(routeLoaders['/journey/persona']!);
const BmcPage = lazy(routeLoaders['/journey/bmc']!);
const PharmaCheckPage = lazy(routeLoaders['/journey/pharma-check']!);

const IncorporationPage = lazy(routeLoaders['/incorporation']!);
const CompanyBasicsPage = lazy(routeLoaders['/journey/company-basics']!);
const PostRegistrationPage = lazy(routeLoaders['/journey/post-registration']!);

const NotificationsPage = lazy(routeLoaders['/notifications']!);
const FundingSearchPage = lazy(routeLoaders['/funding']!);
const FundingDetailPage = lazy(() => import("./features/funding/pages/FundingDetailPage"));
const BankGuidePage = lazy(routeLoaders['/bank']!);
const CreditGuidePage = lazy(routeLoaders['/credit']!);
const ContractsPage = lazy(routeLoaders['/contracts']!);
const TaxCalendarPage = lazy(routeLoaders['/tax-calendar']!);
const LaborGuidePage = lazy(routeLoaders['/labor']!);
const IpManagementPage = lazy(routeLoaders['/ip-management']!);
const SimulatorPage = lazy(routeLoaders['/simulator']!);
const KpiTrackerPage = lazy(routeLoaders['/kpi-tracker']!);
const PitchDeckPage = lazy(routeLoaders['/pitch']!);
const PitchPracticePage = lazy(routeLoaders['/pitch-practice']!);
const InvestorMatchPage = lazy(routeLoaders['/investor']!);
const TeamPage = lazy(routeLoaders['/team']!);
const DdPreparationPage = lazy(routeLoaders['/dd-preparation']!);
const IpoRoadmapPage = lazy(routeLoaders['/ipo-roadmap']!);
const MarketingPage = lazy(routeLoaders['/marketing']!);
const BusinessPlanPage = lazy(routeLoaders['/business-plan']!);
const CommunityPage = lazy(routeLoaders['/community']!);
const MvpPage = lazy(routeLoaders['/journey/mvp']!);
const FirstCustomersPage = lazy(routeLoaders['/journey/first-customers']!);
const CustomerInterviewPage = lazy(routeLoaders['/journey/customer-interview']!);

function P({ C }: { C: React.LazyExoticComponent<React.ComponentType<any>> }) {
  return (
    <ProtectedRoute>
      <C />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<L C={LoginPage} />} />
        <Route path="/auth/reset-password" element={<L C={ResetPasswordPage} />} />
        <Route path="/auth/update-password" element={<L C={UpdatePasswordPage} />} />
        <Route path="/invite/:token" element={<L C={AcceptInvitePage} />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<P C={DashboardPage} />} />
        <Route path="/journey" element={<P C={JourneyPage} />} />
        <Route path="/journey/business-idea" element={<P C={BusinessIdeaPage} />} />
        <Route path="/journey/market-size" element={<P C={MarketSizePage} />} />
        <Route path="/journey/competitor-analysis" element={<P C={CompetitorAnalysisPage} />} />
        <Route path="/journey/persona" element={<P C={PersonaPage} />} />
        <Route path="/journey/bmc" element={<P C={BmcPage} />} />
        <Route path="/journey/pharma-check" element={<P C={PharmaCheckPage} />} />
        <Route path="/company/setup" element={<P C={CompanySetupPage} />} />
        <Route path="/company/new" element={<P C={NewCompanyPage} />} />

        <Route path="/naming" element={<P C={TrademarkGuidePage} />} />
        <Route path="/naming/generate" element={<P C={NamingPage} />} />
        <Route path="/naming/category" element={<P C={CategorySelectPage} />} />
        <Route path="/naming/checklist" element={<P C={ChecklistPage} />} />
        <Route path="/naming/cost" element={<P C={CostSimulatorPage} />} />
        <Route path="/naming/monitoring" element={<P C={MonitoringPage} />} />

        <Route path="/journey/company-basics" element={<P C={CompanyBasicsPage} />} />
        <Route path="/journey/post-registration" element={<P C={PostRegistrationPage} />} />

        <Route path="/incorporation" element={<P C={IncorporationPage} />} />
        <Route path="/notifications" element={<P C={NotificationsPage} />} />
        <Route path="/bank" element={<P C={BankGuidePage} />} />
        <Route path="/credit" element={<P C={CreditGuidePage} />} />
        <Route path="/contracts" element={<P C={ContractsPage} />} />
        <Route path="/tax-calendar" element={<P C={TaxCalendarPage} />} />
        <Route path="/labor" element={<P C={LaborGuidePage} />} />

        <Route path="/funding" element={<P C={FundingSearchPage} />} />
        <Route path="/funding/:id" element={<P C={FundingDetailPage} />} />
        <Route path="/simulator" element={<P C={SimulatorPage} />} />
        <Route path="/kpi-tracker" element={<P C={KpiTrackerPage} />} />
        <Route path="/ip-management" element={<P C={IpManagementPage} />} />

        <Route path="/pitch" element={<P C={PitchDeckPage} />} />
        <Route path="/pitch-practice" element={<P C={PitchPracticePage} />} />
        <Route path="/investor" element={<P C={InvestorMatchPage} />} />
        <Route path="/team" element={<P C={TeamPage} />} />
        <Route path="/dd-preparation" element={<P C={DdPreparationPage} />} />
        <Route path="/ipo-roadmap" element={<P C={IpoRoadmapPage} />} />

        <Route path="/marketing" element={<P C={MarketingPage} />} />
        <Route path="/business-plan" element={<P C={BusinessPlanPage} />} />
        <Route path="/community" element={<P C={CommunityPage} />} />

        <Route path="/journey/mvp" element={<P C={MvpPage} />} />
        <Route path="/journey/first-customers" element={<P C={FirstCustomersPage} />} />
        <Route path="/journey/customer-interview" element={<P C={CustomerInterviewPage} />} />

        <Route path="/team/invite" element={<P C={InvitePage} />} />
        <Route path="/settings" element={<P C={SettingsPage} />} />

        <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboardPage /></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><AdminUsersPage /></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/leads" element={<ProtectedRoute><AdminRoute><AdminLeadsPage /></AdminRoute></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
