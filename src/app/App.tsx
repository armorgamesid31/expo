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
import { InstagramInboxPage } from './pages/InstagramInboxPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { PackagesPage } from './pages/PackagesPage';
import { NotificationSettingsPage } from './pages/NotificationSettingsPage';
import { NotificationsInboxPage } from './pages/NotificationsInboxPage';
import { NotificationRoleMatrixPage } from './pages/NotificationRoleMatrixPage';
import { LocaleProvider } from './context/LocaleContext';

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
        <div className="flex flex-col items-center gap-3">
          <img
            src="https://cdn.kedyapp.com/kedylogo_koyu.png"
            alt="Kedy Logo"
            className="h-[52px] w-auto dark:hidden"
            loading="eager"
          />
          <img
            src="https://cdn.kedyapp.com/kedylogo_beyazturuncu.png"
            alt="Kedy Logo"
            className="hidden h-[52px] w-auto dark:block"
            loading="eager"
          />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
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
          <Route path="conversations" element={<ConversationsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="campaigns" element={<CampaignsCrudPage />} />
          <Route path="automations" element={<AutomationsCrudPage />} />
          <Route path="blacklist" element={<BlacklistPage />} />
          <Route path="instagram-inbox" element={<InstagramInboxPage />} />
          <Route path="salon-info" element={<SalonSetupPage />} />
          <Route path="services" element={<ServicesCrudPage />} />
          <Route path="packages" element={<PackagesPage />} />
          <Route path="staff" element={<StaffCrudPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="features/:featureKey" element={<FeatureDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notification-settings" element={<NotificationSettingsPage />} />
          <Route path="notifications" element={<NotificationsInboxPage />} />
          <Route path="notification-role-matrix" element={<NotificationRoleMatrixPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <ThemeBootstrap />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </LocaleProvider>
  );
}
