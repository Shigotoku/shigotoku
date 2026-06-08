import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ManualsListPage from "./pages/ManualsListPage";
import ManualNewPage from "./pages/ManualNewPage";
import ManualRecordCreatePage from "./pages/ManualRecordCreatePage";
import ManualTalkCreatePage from "./pages/ManualTalkCreatePage";
import ManualScreenshotCreatePage from "./pages/ManualScreenshotCreatePage";
import BulkUpdatePage from "./pages/BulkUpdatePage";
import AssistantPage from "./pages/AssistantPage";
import ManualEditPage from "./pages/ManualEditPage";
import ManualSharePage from "./pages/ManualSharePage";
import ManualPreviewPage from "./pages/ManualPreviewPage";
import TemplatesPage from "./pages/TemplatesPage";
import TeamPage from "./pages/TeamPage";
import SettingsPage from "./pages/SettingsPage";
import SharedManualPage from "./pages/SharedManualPage";
import SharedFolderPage from "./pages/SharedFolderPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";

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
      <Route path="/f/:token" element={<SharedFolderPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />

      {/* 認証必須（ダッシュボードレイアウト） */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<P><DashboardPage /></P>} />
        <Route path="/manuals" element={<P><ManualsListPage /></P>} />
        <Route path="/manuals/new" element={<P><ManualNewPage /></P>} />
        <Route path="/manuals/new/record" element={<P><ManualRecordCreatePage /></P>} />
        <Route path="/manuals/new/talk" element={<P><ManualTalkCreatePage /></P>} />
        <Route path="/manuals/new/screenshots" element={<P><ManualScreenshotCreatePage /></P>} />
        <Route path="/manuals/:id/edit" element={<P><ManualEditPage /></P>} />
        <Route path="/manuals/:id/preview" element={<P><ManualPreviewPage /></P>} />
        <Route path="/manuals/:id/share" element={<P><ManualSharePage /></P>} />
        <Route path="/bulk-update" element={<P><BulkUpdatePage /></P>} />
        <Route path="/assistant" element={<P><AssistantPage /></P>} />
        <Route path="/templates" element={<P><TemplatesPage /></P>} />
        <Route path="/team" element={<P><TeamPage /></P>} />
        <Route path="/settings" element={<P><SettingsPage /></P>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
