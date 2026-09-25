import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import { RouteGuard } from "@/features/auth/RouteGuard";
import LoginPage from "@/features/auth/LoginPage";
import OverviewPage from "@/features/forms/OverviewPage";
import FormsListPage from "@/features/forms/FormsListPage";
import BuilderPage from "@/features/builder/BuilderPage";
import ResponsesPage from "@/features/responses/ResponsesPage";
import AnalyticsPage from "@/features/analytics/AnalyticsPage";
import LeadsPage from "@/features/leads/LeadsPage";
import SettingsPage from "@/features/settings/SettingsPage";
import PublicFormPage from "@/features/runtime/PublicFormPage";
import SignUpPage from "@/features/auth/SignUpPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />

      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin/signup" element={<SignUpPage />} />

      <Route element={<RouteGuard />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<OverviewPage />} />
          <Route path="/admin/forms" element={<FormsListPage />} />
          <Route path="/admin/forms/new" element={<FormsListPage />} />
          <Route path="/admin/forms/:id/edit" element={<BuilderPage />} />
          <Route path="/admin/forms/:id/responses" element={<ResponsesPage />} />
          <Route path="/admin/forms/:id/analytics" element={<AnalyticsPage />} />
          <Route path="/admin/leads" element={<LeadsPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="/f/:slug" element={<PublicFormPage />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-6">
      <div>
        <span className="mono-label text-cyan">404</span>
        <h1 className="text-2xl mt-2">Page not found.</h1>
      </div>
    </div>
  );
}
