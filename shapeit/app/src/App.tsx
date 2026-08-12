import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import CapturePage from "./pages/CapturePage";
import InboxPage from "./pages/InboxPage";
import BoardPage from "./pages/BoardPage";
import IssueDetailPage from "./pages/IssueDetailPage";
import MyFeedbackPage from "./pages/MyFeedbackPage";
import SettingsPage from "./pages/SettingsPage";
import ExtensionInstallPage from "./pages/ExtensionInstallPage";
import ChangelogPage from "./pages/ChangelogPage";
import InsightsPage from "./pages/InsightsPage";
import DigestPage from "./pages/DigestPage";
import IdeasPage from "./pages/IdeasPage";
import RoadmapPage from "./pages/RoadmapPage";
import PublicChangelogPage from "./pages/PublicChangelogPage";
import OnboardingPage from "./pages/OnboardingPage";
import AuditPage from "./pages/AuditPage";
import RankingPage from "./pages/RankingPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import CustomerPortalPage from "./pages/CustomerPortalPage";
import AskAiPage from "./pages/AskAiPage";
import HeatmapPage from "./pages/HeatmapPage";
import FixPacksPage from "./pages/FixPacksPage";
import FixPackDetailPage from "./pages/FixPackDetailPage";
import GoldenEvalPage from "./pages/GoldenEvalPage";
import LegalChecklistPage from "./pages/LegalChecklistPage";
import { useAuth } from "./components/AuthProvider";
import { t } from "./lib/i18n";
import { loadFlags } from "./lib/featureFlags";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, isAuthenticated } = useAuth();
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink/60">
        {t("loading")}
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function FlagRoute({
  flag,
  children,
}: {
  flag: keyof ReturnType<typeof loadFlags>;
  children: React.ReactNode;
}) {
  if (!loadFlags()[flag]) return <Navigate to="/capture" replace />;
  return children;
}

export default function App() {
  const flags = loadFlags();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public/changelog" element={<PublicChangelogPage />} />
      <Route
        path="/portal/:token"
        element={
          flags.customerPortal ? <CustomerPortalPage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/capture" replace />} />
        <Route path="/capture" element={<CapturePage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="/issues/:id" element={<IssueDetailPage />} />
        <Route path="/my-feedback" element={<MyFeedbackPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route
          path="/insights"
          element={
            <FlagRoute flag="insights">
              <InsightsPage />
            </FlagRoute>
          }
        />
        <Route
          path="/digest"
          element={
            <FlagRoute flag="digest">
              <DigestPage />
            </FlagRoute>
          }
        />
        <Route
          path="/ideas"
          element={
            <FlagRoute flag="ideas">
              <IdeasPage />
            </FlagRoute>
          }
        />
        <Route
          path="/roadmap"
          element={
            <FlagRoute flag="roadmap">
              <RoadmapPage />
            </FlagRoute>
          }
        />
        <Route
          path="/ranking"
          element={
            <FlagRoute flag="ranking">
              <RankingPage />
            </FlagRoute>
          }
        />
        <Route path="/ask" element={<AskAiPage />} />
        <Route path="/fix-packs" element={<FixPacksPage />} />
        <Route path="/fix-packs/:packId" element={<FixPackDetailPage />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/golden" element={<GoldenEvalPage />} />
        <Route path="/legal" element={<LegalChecklistPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route
          path="/integrations"
          element={
            <FlagRoute flag="webhooks">
              <IntegrationsPage />
            </FlagRoute>
          }
        />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/extension/install" element={<ExtensionInstallPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/capture" replace />} />
    </Routes>
  );
}
