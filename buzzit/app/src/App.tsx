import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/appContext';
import { AuthProvider } from './store/authContext';
import { StoreProvider } from './store/storeContext';
import ProtectedRoute from './components/ProtectedRoute';
import HeadlineFitRoot from './components/HeadlineFitRoot';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import MagicCreator from './pages/MagicCreator';
import AnalyticsPage from './pages/AnalyticsPage';
import LineCrmPage from './pages/LineCrmPage';
import SettingsPage from './pages/SettingsPage';
import TeamPage from './pages/TeamPage';
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
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="magic-creator" element={<MagicCreator />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="line-crm" element={<LineCrmPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="team" element={<TeamPage />} />
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
