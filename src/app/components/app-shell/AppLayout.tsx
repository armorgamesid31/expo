import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ChevronLeft, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BottomNav } from '../layout/BottomNav';
import { useAuth } from '../../context/AuthContext';
import { useNavigator } from '../../context/NavigatorContext';

function transitionMotionByKind(vector: number) {
  // Vector 1: Slide Content RIGHT (New from Left) - Used for Forward Tabs / Up Hierarchy
  // Vector -1: Slide Content LEFT (New from Right) - Used for Forward Hierarchy / Back Tabs
  if (vector === 0) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 }
    };
  }

  return {
    initial: { 
      x: vector === 1 ? '-100%' : '100%'
    },
    animate: { 
      x: 0
    },
    exit: { 
      x: vector === 1 ? '100%' : '-100%'
    },
    transition: { 
      duration: 0.35, 
      ease: [0.33, 1, 0.68, 1] 
    }
  };
}

function tabFromPathname(pathname: string) {
  if (pathname.startsWith('/app/schedule')) return 'schedule';
  if (pathname.startsWith('/app/conversations')) return 'conversations';
  const settingsRoutes = [
    '/app/customers', '/app/analytics', '/app/inventory', '/app/campaigns', 
    '/app/automations', '/app/instagram-inbox', '/app/blacklist', '/app/salon-info', 
    '/app/services', '/app/staff', '/app/data-import', '/app/operations-management', 
    '/app/brand-growth-hub', '/app/features', '/app/settings', '/app/notification-settings',
    '/app/notifications', '/app/notification-role-matrix', '/app/team-access', '/app/team-management'
  ];
  if (settingsRoutes.some(route => pathname.startsWith(route))) return 'settings';
  return 'dashboard';
}

function backTargetFromPathname(pathname: string): string | null {
  if (pathname === '/app/dashboard' || pathname === '/app/features' || pathname === '/app/schedule' || pathname === '/app/conversations') {
    return null;
  }

  // Management Hubs (Parent: features)
  const hubs = ['/app/operations-management', '/app/brand-growth-hub', '/app/team-management'];
  if (hubs.some(hub => pathname === hub)) return '/app/features';

  // Operations Studio children
  const opsChildren = ['/app/inventory', '/app/services', '/app/packages', '/app/data-import'];
  if (opsChildren.some(child => pathname === child)) return '/app/operations-management';

  // Brand Hub children
  const brandChildren = ['/app/campaigns', '/app/instagram-inbox', '/app/features/social-channels'];
  if (brandChildren.some(child => pathname === child)) return '/app/brand-growth-hub';

  // Communication Hub children
  const commsChildren = ['/app/features/whatsapp-settings', '/app/features/ai-settings', '/app/automations', '/app/features/whatsapp-setup', '/app/features/whatsapp-agent'];
  if (commsChildren.some(child => pathname === child)) return '/app/features/social-channels';

  // Team Hub children
  const teamChildren = ['/app/staff', '/app/team-access', '/app/notification-role-matrix'];
  if (teamChildren.some(child => pathname === child)) return '/app/team-management';

  // Settings & Others
  if (pathname.startsWith('/app/notification-settings')) return '/app/settings';
  if (pathname.startsWith('/app/notifications')) return '/app/settings';
  if (pathname.startsWith('/app/settings')) return '/app/features';
  if (pathname.startsWith('/app/salon-info')) return '/app/features';
  if (pathname.startsWith('/app/blacklist')) return '/app/features';
  if (pathname.startsWith('/app/features/')) return '/app/features';

  return '/app/features';
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { direction, headerTitle, headerActions } = useNavigator();
  const { logout } = useAuth();

  const activeTab = tabFromPathname(location.pathname);
  let backTarget = backTargetFromPathname(location.pathname);

  const fromState = (location.state as any)?.from;
  if (fromState && typeof fromState === 'string') {
    backTarget = fromState;
  }

  const transitionMotion = transitionMotionByKind(direction);

  const handleTabChange = (tab: string) => {
    const routeMap: Record<string, string> = {
      schedule: '/app/schedule',
      conversations: '/app/conversations',
      settings: '/app/features',
      dashboard: '/app/dashboard'
    };
    navigate(routeMap[tab] || '/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <header className="fixed top-0 left-0 right-0 z-40 glass-panel border-b border-border safe-top">
        <div className="max-w-screen-xl mx-auto px-2 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 flex items-center justify-center">
              {backTarget && (
                <button
                  type="button"
                  onClick={() => window.history.length > 2 ? navigate(-1) : navigate(backTarget!, { state: { navDirection: 'back' } })}
                  className="h-9 w-9 grid place-items-center rounded-xl glass-card transition-all active:scale-90"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
              )}
            </div>
            
            {headerTitle && (
              <h1 className="text-lg font-bold tracking-tight px-1 truncate max-w-[200px]">
                {headerTitle}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2 min-w-[36px] justify-end">
            {headerActions ? headerActions : (
              <button
                type="button"
                onClick={() => void logout()}
                className="h-9 w-9 grid place-items-center rounded-xl text-muted-foreground transition-all active:scale-90 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-20 pb-24 overflow-x-hidden min-h-screen relative">
        <div className="max-w-screen-xl mx-auto px-2 lg:px-8">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={location.pathname}
              initial={transitionMotion.initial}
              animate={transitionMotion.animate}
              exit={transitionMotion.exit}
              transition={transitionMotion.transition}
              className="w-full h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div className="w-full max-w-screen-xl pointer-events-auto">
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>
    </div>
  );
}
