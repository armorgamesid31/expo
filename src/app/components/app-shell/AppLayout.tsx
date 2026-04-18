import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { BottomNav } from '../layout/BottomNav';
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

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { direction } = useNavigator();

  const activeTab = tabFromPathname(location.pathname);
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
      <main className="pt-4 pb-24 overflow-x-hidden min-h-screen relative">
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
