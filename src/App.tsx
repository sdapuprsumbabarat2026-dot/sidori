import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import IrrigationTypesPage from "./pages/IrrigationTypesPage";
import AreaDocumentsPage from "./pages/AreaDocumentsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAreasPage from "./pages/admin/AdminAreasPage";
import AdminReviewPage from "./pages/admin/AdminReviewPage";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="irigasi" element={<IrrigationTypesPage />} />
            <Route path="area/:id" element={<AreaDocumentsPage />} />
            <Route path="admin/users" element={<ProtectedRoute adminOnly><AdminUsersPage /></ProtectedRoute>} />
            <Route path="admin/areas" element={<ProtectedRoute adminOnly><AdminAreasPage /></ProtectedRoute>} />
            <Route path="admin/review" element={<ProtectedRoute adminOnly><AdminReviewPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
