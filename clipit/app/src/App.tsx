import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ManualNewPage from "./pages/ManualNewPage";
import ManualEditPage from "./pages/ManualEditPage";
import ManualSharePage from "./pages/ManualSharePage";
import TemplatesPage from "./pages/TemplatesPage";
import TeamPage from "./pages/TeamPage";
import SettingsPage from "./pages/SettingsPage";
import SharedManualPage from "./pages/SharedManualPage";

function P({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      {/* 公開（認証不要） */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/m/:token" element={<SharedManualPage />} />

      {/* 認証必須（ダッシュボードレイアウト） */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<P><DashboardPage /></P>} />
        <Route path="/manuals/new" element={<P><ManualNewPage /></P>} />
        <Route path="/manuals/:id/edit" element={<P><ManualEditPage /></P>} />
        <Route path="/manuals/:id/share" element={<P><ManualSharePage /></P>} />
        <Route path="/templates" element={<P><TemplatesPage /></P>} />
        <Route path="/team" element={<P><TeamPage /></P>} />
        <Route path="/settings" element={<P><SettingsPage /></P>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
