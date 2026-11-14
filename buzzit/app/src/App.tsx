import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/appContext';
import { AuthProvider } from './store/authContext';
import { StoreProvider } from './store/storeContext';
import { PersonaProvider } from './store/personaContext';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingGate from './components/OnboardingGate';
import HeadlineFitRoot from './components/HeadlineFitRoot';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import TodayPage from './pages/TodayPage';
const GuidePage = lazy(() => import('./pages/GuidePage'));
import LoginPage from './pages/LoginPage';
const MagicCreator = lazy(() => import('./pages/MagicCreator'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const LineCrmPage = lazy(() => import('./pages/LineCrmPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const FunnelBuilderPage = lazy(() => import('./pages/FunnelBuilderPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const ContentCalendarPage = lazy(() => import('./pages/ContentCalendarPage'));
const XSeriesPage = lazy(() => import('./pages/XSeriesPage'));
const SnsHubPage = lazy(() => import('./pages/SnsHubPage'));
import OnboardingPage from './pages/OnboardingPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import AcceptAccountInvitePage from './pages/AcceptAccountInvitePage';
import AccountSetupPage from './pages/AccountSetupPage';
import AccountSetupGate from './components/AccountSetupGate';
const AdminAccountsPage = lazy(() => import('./pages/AdminAccountsPage'));
import OAuthAuthorizePage from './pages/OAuthAuthorizePage';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <StoreProvider>
          <PersonaProvider>
          <BrowserRouter>
            <HeadlineFitRoot />
            <Suspense fallback={<div className="p-6 text-sm text-neutral-500">読み込み中…</div>}>
<Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/invite/:token" element={<AcceptInvitePage />} />
              <Route path="/account-invite/:token" element={<AcceptAccountInvitePage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/oauth/authorize" element={<OAuthAuthorizePage />} />
                <Route element={<AccountSetupGate />}>
                  <Route path="/account-setup" element={<AccountSetupPage />} />
                  <Route element={<OnboardingGate />}>
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
<Route path="today" element={<TodayPage />} />
                    <Route path="guide" element={<GuidePage />} />
                    <Route path="roadmap" element={<RoadmapPage />} />
                    <Route path="magic-creator" element={<MagicCreator />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="sns/:platformId" element={<SnsHubPage />} />
                    <Route path="x-series" element={<XSeriesPage />} />
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="funnel" element={<FunnelBuilderPage />} />
                    <Route path="content-calendar" element={<ContentCalendarPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="line-crm" element={<LineCrmPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="team" element={<Navigate to="/settings?tab=staff" replace />} />
                    <Route path="admin/accounts" element={<AdminAccountsPage />} />
                  </Route>
                  </Route>
                </Route>
              </Route>
            </Routes>
</Suspense>
          </BrowserRouter>
          </PersonaProvider>
        </StoreProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
