import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BottomNav } from '../layout/BottomNav';
import { useAuth } from '../../context/AuthContext';

function tabFromPathname(pathname: string) {
  if (pathname.startsWith('/app/schedule')) return 'schedule';
  if (pathname.startsWith('/app/customers')) return 'features';
  if (pathname.startsWith('/app/analytics')) return 'features';
  if (pathname.startsWith('/app/inventory')) return 'features';
  if (pathname.startsWith('/app/campaigns')) return 'features';
  if (pathname.startsWith('/app/automations')) return 'features';
  if (pathname.startsWith('/app/blacklist')) return 'features';
  if (pathname.startsWith('/app/salon-info')) return 'features';
  if (pathname.startsWith('/app/services')) return 'features';
  if (pathname.startsWith('/app/staff')) return 'features';
  if (pathname.startsWith('/app/features')) return 'features';
  if (pathname.startsWith('/app/settings')) return 'settings';
  return 'dashboard';
}

function backTargetFromPathname(pathname: string): string | null {
  if (pathname.startsWith('/app/features/')) return '/app/features';

  const featureModuleRoutes = [
    '/app/customers',
    '/app/analytics',
    '/app/inventory',
    '/app/campaigns',
    '/app/automations',
    '/app/blacklist',
    '/app/salon-info',
    '/app/services',
    '/app/staff',
  ];

  if (featureModuleRoutes.some((route) => pathname.startsWith(route))) {
    return '/app/features';
  }

  return null;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { bootstrap, logout } = useAuth();

  const activeTab = tabFromPathname(location.pathname);
  const backTarget = backTargetFromPathname(location.pathname);

  const handleTabChange = (tab: string) => {
    if (tab === 'schedule') {
      navigate('/app/schedule');
      return;
    }
    if (tab === 'features') {
      navigate('/app/features');
      return;
    }
    if (tab === 'settings') {
      navigate('/app/settings');
      return;
    }
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-[var(--luxury-bg)]">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {backTarget ? (
              <button
                type="button"
                onClick={() => navigate(backTarget)}
                className="h-8 w-8 grid place-items-center rounded-md border border-border text-muted-foreground"
                aria-label="Geri"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div>
              <p className="text-xs text-muted-foreground">{bootstrap?.salon?.city || 'Salon'}</p>
              <p className="text-sm font-semibold leading-tight">{bootstrap?.salon?.name || 'Kedy App'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground"
          >
            Çıkış
          </button>
        </div>
      </header>

      <main className="pb-20">
        <Outlet />
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
