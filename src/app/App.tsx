import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthGuard } from './components/app-shell/AuthGuard';
import { AppLayout } from './components/app-shell/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';
import { CustomersPage } from './pages/CustomersPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { FeatureDetailPage } from './pages/FeatureDetailPage';
import { SettingsPage } from './pages/SettingsPage';

function RootRedirect() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--luxury-bg)] text-foreground">
        <p className="text-sm text-muted-foreground">Yukleniyor...</p>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/app/dashboard' : '/auth/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth/login" element={<LoginPage />} />

      <Route element={<AuthGuard />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="features/:featureKey" element={<FeatureDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
