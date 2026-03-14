import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
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
import { SalonSetupPage } from './pages/SalonSetupPage';
import { ServicesCrudPage } from './pages/ServicesCrudPage';
import { StaffCrudPage } from './pages/StaffCrudPage';
import { InventoryPage } from './pages/InventoryPage';
import { CampaignsCrudPage } from './pages/CampaignsCrudPage';
import { AutomationsCrudPage } from './pages/AutomationsCrudPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BlacklistPage } from './pages/BlacklistPage';

const THEME_PREF_KEY = 'kedy.mobile.theme.dark';

function ThemeBootstrap() {
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const pref = await Preferences.get({ key: THEME_PREF_KEY });
        if (!mounted) return;
        document.documentElement.classList.toggle('dark', pref.value === '1');
      } catch (error) {
        console.warn('Theme bootstrap failed:', error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}

function RootRedirect() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--luxury-bg)] text-foreground">
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
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
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="campaigns" element={<CampaignsCrudPage />} />
          <Route path="automations" element={<AutomationsCrudPage />} />
          <Route path="blacklist" element={<BlacklistPage />} />
          <Route path="salon-info" element={<SalonSetupPage />} />
          <Route path="services" element={<ServicesCrudPage />} />
          <Route path="staff" element={<StaffCrudPage />} />
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
      <ThemeBootstrap />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
