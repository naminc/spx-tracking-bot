import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { AdminLayout } from "./layouts/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { PublicTrackingPage } from "./pages/PublicTrackingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrdersPage } from "./pages/OrdersPage";
import { BroadcastPage } from "./pages/BroadcastPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TrackingActionLogsPage } from "./pages/TrackingActionLogsPage";
import { TrackingHistoryPage } from "./pages/TrackingHistoryPage";
import { UsersPage } from "./pages/UsersPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAuthError } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated || isAuthError) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/track" element={<PublicTrackingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/tracking-history" element={<TrackingHistoryPage />} />
        <Route path="/tracking-action-logs" element={<TrackingActionLogsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/broadcasts" element={<BroadcastPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
