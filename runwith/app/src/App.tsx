import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  );
}

function L({ C }: { C: React.LazyExoticComponent<React.ComponentType<any>> }) {
  return <Suspense fallback={<PageLoader />}><C /></Suspense>;
}

const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminLeadsPage = lazy(() => import("./pages/admin/AdminLeadsPage"));

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const UpdatePasswordPage = lazy(() => import("./pages/auth/UpdatePasswordPage"));
const AcceptInvitePage = lazy(() => import("./pages/auth/AcceptInvitePage"));

const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const JourneyPage = lazy(() => import("./pages/journey/JourneyPage"));
const CompanySetupPage = lazy(() => import("./pages/auth/CompanySetupPage"));
const NewCompanyPage = lazy(() => import("./pages/auth/NewCompanyPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const InvitePage = lazy(() => import("./pages/team/InvitePage"));

const NamingPage = lazy(() => import("./features/naming/pages/NamingPage"));
const TrademarkGuidePage = lazy(() => import("./features/naming/pages/TrademarkGuidePage"));
const CategorySelectPage = lazy(() => import("./features/naming/pages/CategorySelectPage"));
const ChecklistPage = lazy(() => import("./features/naming/pages/ChecklistPage"));
const CostSimulatorPage = lazy(() => import("./features/naming/pages/CostSimulatorPage"));
const MonitoringPage = lazy(() => import("./features/naming/pages/MonitoringPage"));

const BusinessIdeaPage = lazy(() => import("./features/idea-tools/pages/BusinessIdeaPage"));
const MarketSizePage = lazy(() => import("./features/idea-tools/pages/MarketSizePage"));
const CompetitorAnalysisPage = lazy(() => import("./features/idea-tools/pages/CompetitorAnalysisPage"));
const PersonaPage = lazy(() => import("./features/idea-tools/pages/PersonaPage"));
const BmcPage = lazy(() => import("./features/idea-tools/pages/BmcPage"));
const PharmaCheckPage = lazy(() => import("./features/idea-tools/pages/PharmaCheckPage"));

const IncorporationPage = lazy(() => import("./features/incorporation/pages/IncorporationPage"));
const CompanyBasicsPage = lazy(() => import("./features/incorporation/pages/CompanyBasicsPage"));
const PostRegistrationPage = lazy(() => import("./features/incorporation/pages/PostRegistrationPage"));

const NotificationsPage = lazy(() => import("./features/notifications/pages/NotificationsPage"));
const FundingSearchPage = lazy(() => import("./features/funding/pages/FundingSearchPage"));
const FundingDetailPage = lazy(() => import("./features/funding/pages/FundingDetailPage"));
const BankGuidePage = lazy(() => import("./features/bank/pages/BankGuidePage"));
const CreditGuidePage = lazy(() => import("./features/credit/pages/CreditGuidePage"));
const ContractsPage = lazy(() => import("./features/contracts/pages/ContractsPage"));
const TaxCalendarPage = lazy(() => import("./features/tax/pages/TaxCalendarPage"));
const LaborGuidePage = lazy(() => import("./features/labor/pages/LaborGuidePage"));
const IpManagementPage = lazy(() => import("./features/ip/pages/IpManagementPage"));
const SimulatorPage = lazy(() => import("./features/simulator/pages/SimulatorPage"));
const KpiTrackerPage = lazy(() => import("./features/kpi/pages/KpiTrackerPage"));
const PitchDeckPage = lazy(() => import("./features/pitch/pages/PitchDeckPage"));
const PitchPracticePage = lazy(() => import("./features/pitch/pages/PitchPracticePage"));
const InvestorMatchPage = lazy(() => import("./features/investor/pages/InvestorMatchPage"));
const TeamPage = lazy(() => import("./features/team/pages/TeamPage"));
const DdPreparationPage = lazy(() => import("./features/dd/pages/DdPreparationPage"));
const IpoRoadmapPage = lazy(() => import("./features/ipo/pages/IpoRoadmapPage"));
const MarketingPage = lazy(() => import("./features/marketing/pages/MarketingPage"));
const BusinessPlanPage = lazy(() => import("./features/business-plan/pages/BusinessPlanPage"));
const CommunityPage = lazy(() => import("./features/community/pages/CommunityPage"));
const MvpPage = lazy(() => import("./features/seed/pages/MvpPage"));
const FirstCustomersPage = lazy(() => import("./features/seed/pages/FirstCustomersPage"));
const CustomerInterviewPage = lazy(() => import("./features/seed/pages/CustomerInterviewPage"));

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
        <Route path="/dashboard" element={<ProtectedRoute><L C={DashboardPage} /></ProtectedRoute>} />
        <Route path="/journey" element={<ProtectedRoute><L C={JourneyPage} /></ProtectedRoute>} />
        <Route path="/journey/business-idea" element={<ProtectedRoute><L C={BusinessIdeaPage} /></ProtectedRoute>} />
        <Route path="/journey/market-size" element={<ProtectedRoute><L C={MarketSizePage} /></ProtectedRoute>} />
        <Route path="/journey/competitor-analysis" element={<ProtectedRoute><L C={CompetitorAnalysisPage} /></ProtectedRoute>} />
        <Route path="/journey/persona" element={<ProtectedRoute><L C={PersonaPage} /></ProtectedRoute>} />
        <Route path="/journey/bmc" element={<ProtectedRoute><L C={BmcPage} /></ProtectedRoute>} />
        <Route path="/journey/pharma-check" element={<ProtectedRoute><L C={PharmaCheckPage} /></ProtectedRoute>} />
        <Route path="/company/setup" element={<ProtectedRoute><L C={CompanySetupPage} /></ProtectedRoute>} />
        <Route path="/company/new" element={<ProtectedRoute><L C={NewCompanyPage} /></ProtectedRoute>} />

        <Route path="/naming" element={<ProtectedRoute><L C={TrademarkGuidePage} /></ProtectedRoute>} />
        <Route path="/naming/generate" element={<ProtectedRoute><L C={NamingPage} /></ProtectedRoute>} />
        <Route path="/naming/category" element={<ProtectedRoute><L C={CategorySelectPage} /></ProtectedRoute>} />
        <Route path="/naming/checklist" element={<ProtectedRoute><L C={ChecklistPage} /></ProtectedRoute>} />
        <Route path="/naming/cost" element={<ProtectedRoute><L C={CostSimulatorPage} /></ProtectedRoute>} />
        <Route path="/naming/monitoring" element={<ProtectedRoute><L C={MonitoringPage} /></ProtectedRoute>} />

        <Route path="/journey/company-basics" element={<ProtectedRoute><L C={CompanyBasicsPage} /></ProtectedRoute>} />
        <Route path="/journey/post-registration" element={<ProtectedRoute><L C={PostRegistrationPage} /></ProtectedRoute>} />

        <Route path="/incorporation" element={<ProtectedRoute><L C={IncorporationPage} /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><L C={NotificationsPage} /></ProtectedRoute>} />
        <Route path="/bank" element={<ProtectedRoute><L C={BankGuidePage} /></ProtectedRoute>} />
        <Route path="/credit" element={<ProtectedRoute><L C={CreditGuidePage} /></ProtectedRoute>} />
        <Route path="/contracts" element={<ProtectedRoute><L C={ContractsPage} /></ProtectedRoute>} />
        <Route path="/tax-calendar" element={<ProtectedRoute><L C={TaxCalendarPage} /></ProtectedRoute>} />
        <Route path="/labor" element={<ProtectedRoute><L C={LaborGuidePage} /></ProtectedRoute>} />

        <Route path="/funding" element={<ProtectedRoute><L C={FundingSearchPage} /></ProtectedRoute>} />
        <Route path="/funding/:id" element={<ProtectedRoute><L C={FundingDetailPage} /></ProtectedRoute>} />
        <Route path="/simulator" element={<ProtectedRoute><L C={SimulatorPage} /></ProtectedRoute>} />
        <Route path="/kpi-tracker" element={<ProtectedRoute><L C={KpiTrackerPage} /></ProtectedRoute>} />
        <Route path="/ip-management" element={<ProtectedRoute><L C={IpManagementPage} /></ProtectedRoute>} />

        <Route path="/pitch" element={<ProtectedRoute><L C={PitchDeckPage} /></ProtectedRoute>} />
        <Route path="/pitch-practice" element={<ProtectedRoute><L C={PitchPracticePage} /></ProtectedRoute>} />
        <Route path="/investor" element={<ProtectedRoute><L C={InvestorMatchPage} /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute><L C={TeamPage} /></ProtectedRoute>} />
        <Route path="/dd-preparation" element={<ProtectedRoute><L C={DdPreparationPage} /></ProtectedRoute>} />
        <Route path="/ipo-roadmap" element={<ProtectedRoute><L C={IpoRoadmapPage} /></ProtectedRoute>} />

        <Route path="/marketing" element={<ProtectedRoute><L C={MarketingPage} /></ProtectedRoute>} />
        <Route path="/business-plan" element={<ProtectedRoute><L C={BusinessPlanPage} /></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><L C={CommunityPage} /></ProtectedRoute>} />

        <Route path="/journey/mvp" element={<ProtectedRoute><L C={MvpPage} /></ProtectedRoute>} />
        <Route path="/journey/first-customers" element={<ProtectedRoute><L C={FirstCustomersPage} /></ProtectedRoute>} />
        <Route path="/journey/customer-interview" element={<ProtectedRoute><L C={CustomerInterviewPage} /></ProtectedRoute>} />

        <Route path="/team/invite" element={<ProtectedRoute><L C={InvitePage} /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><L C={SettingsPage} /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute><AdminRoute><L C={AdminDashboardPage} /></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><L C={AdminUsersPage} /></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/leads" element={<ProtectedRoute><AdminRoute><L C={AdminLeadsPage} /></AdminRoute></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
