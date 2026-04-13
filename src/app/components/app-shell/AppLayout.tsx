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
      x: vector === 1 ? '-100%' : '100%', 
      opacity: 1
    },
    animate: { 
      x: 0, 
      opacity: 1
    },
    exit: { 
      x: vector === 1 ? '100%' : '-100%', 
      opacity: 1
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
    '/app/services', '/app/staff', '/app/data-import', '/app/operations-studio', 
    '/app/brand-growth-hub', '/app/features', '/app/settings', '/app/notification-settings',
    '/app/notifications', '/app/notification-role-matrix', '/app/team-access', '/app/team-management'
  ];
  if (settingsRoutes.some(route => pathname.startsWith(route))) return 'settings';
  return 'dashboard';
}

function backTargetFromPathname(pathname: string): string | null {
  if (pathname === '/app/settings') return '/app/features';
  if (pathname.startsWith('/app/features/')) return '/app/features';
  if (pathname.startsWith('/app/notification-role-matrix')) return '/app/features';
  if (pathname.startsWith('/app/team-access')) return '/app/features';
  if (pathname.startsWith('/app/team-management')) return '/app/features';
  if (pathname.startsWith('/app/data-import')) return '/app/operations-studio';
  if (pathname.startsWith('/app/notification-settings')) return '/app/settings';
  if (pathname.startsWith('/app/notifications')) return '/app/settings';

  const featureModuleRoutes = [
    '/app/customers', '/app/analytics', '/app/inventory', '/app/campaigns', 
    '/app/automations', '/app/instagram-inbox', '/app/blacklist', '/app/salon-info', 
    '/app/services', '/app/staff', '/app/data-import', '/app/team-management', 
    '/app/operations-studio', '/app/brand-growth-hub'
  ];

  if (featureModuleRoutes.some((route) => pathname.startsWith(route))) {
    return '/app/features';
  }

  return null;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { direction } = useNavigator();
  const { bootstrap, logout } = useAuth();

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
        <div className="relative flex items-center justify-between px-4 h-14">
          <div className="w-10">
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

          <div className="flex flex-col items-center">
            <img
              src="https://cdn.kedyapp.com/kedylogo_koyu.png"
              alt="Kedy Logo"
              className="h-8 w-auto dark:hidden"
            />
            <img
              src="https://cdn.kedyapp.com/kedylogo_beyazturuncu.png"
              alt="Kedy Logo"
              className="hidden h-8 w-auto dark:block"
            />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
              {bootstrap?.salon?.name || 'Kedy App'}
            </span>
          </div>

          <div className="w-10 flex justify-end">
            <button
              type="button"
              onClick={() => void logout()}
              className="h-9 w-9 grid place-items-center rounded-xl text-muted-foreground transition-all active:scale-90 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-24 overflow-x-hidden min-h-screen relative">
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
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
