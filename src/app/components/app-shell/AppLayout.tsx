import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from '../layout/BottomNav';
import { useAuth } from '../../context/AuthContext';

function tabFromPathname(pathname: string) {
  if (pathname.startsWith('/app/schedule')) return 'schedule';
  if (pathname.startsWith('/app/features')) return 'features';
  if (pathname.startsWith('/app/settings')) return 'settings';
  return 'dashboard';
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { bootstrap, logout } = useAuth();

  const activeTab = tabFromPathname(location.pathname);

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
          <div>
            <p className="text-xs text-muted-foreground">{bootstrap?.salon?.city || 'Salon'}</p>
            <p className="text-sm font-semibold leading-tight">{bootstrap?.salon?.name || 'Kedy App'}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground"
          >
            Cikis
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
