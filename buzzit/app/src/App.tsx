import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/appContext';
import { AuthProvider } from './store/authContext';
import { StoreProvider } from './store/storeContext';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingGate from './components/OnboardingGate';
import HeadlineFitRoot from './components/HeadlineFitRoot';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import MagicCreator from './pages/MagicCreator';
import AnalyticsPage from './pages/AnalyticsPage';
import LineCrmPage from './pages/LineCrmPage';
import SettingsPage from './pages/SettingsPage';
import TeamPage from './pages/TeamPage';
import RoadmapPage from './pages/RoadmapPage';
import CalendarPage from './pages/CalendarPage';
import FunnelBuilderPage from './pages/FunnelBuilderPage';
import InboxPage from './pages/InboxPage';
import ContentCalendarPage from './pages/ContentCalendarPage';
import XSeriesPage from './pages/XSeriesPage';
import OnboardingPage from './pages/OnboardingPage';
import AcceptInvitePage from './pages/AcceptInvitePage';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <StoreProvider>
          <BrowserRouter>
            <HeadlineFitRoot />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/invite/:token" element={<AcceptInvitePage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<OnboardingGate />}>
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="roadmap" element={<RoadmapPage />} />
                    <Route path="magic-creator" element={<MagicCreator />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="x-series" element={<XSeriesPage />} />
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="funnel" element={<FunnelBuilderPage />} />
                    <Route path="content-calendar" element={<ContentCalendarPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="line-crm" element={<LineCrmPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="team" element={<TeamPage />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </StoreProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
