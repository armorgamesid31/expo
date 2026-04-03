import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BottomNav } from '../layout/BottomNav';
import { useAuth } from '../../context/AuthContext';

type TransitionKind = 'slide-x' | 'slide-y' | 'fade-lift' | 'soft-scale' | 'fade';

function transitionKindFromPathname(pathname: string): TransitionKind {
  if (pathname.startsWith('/app/features')) return 'slide-x';
  if (pathname.startsWith('/app/schedule')) return 'slide-y';
  if (pathname.startsWith('/app/conversations')) return 'soft-scale';
  if (pathname.startsWith('/app/dashboard')) return 'fade-lift';
  if (pathname.startsWith('/app/settings')) return 'fade';
  if (pathname.startsWith('/app/notifications')) return 'soft-scale';
  if (pathname.startsWith('/app/notification-settings')) return 'fade';
  if (pathname.startsWith('/app/notification-role-matrix')) return 'soft-scale';
  if (
    pathname.startsWith('/app/customers') ||
    pathname.startsWith('/app/analytics') ||
    pathname.startsWith('/app/inventory') ||
    pathname.startsWith('/app/campaigns') ||
    pathname.startsWith('/app/automations') ||
    pathname.startsWith('/app/instagram-inbox') ||
    pathname.startsWith('/app/blacklist') ||
    pathname.startsWith('/app/salon-info') ||
    pathname.startsWith('/app/services') ||
    pathname.startsWith('/app/staff')
  ) {
    return 'soft-scale';
  }
  return 'slide-x';
}

function transitionMotionByKind(kind: TransitionKind, direction: 1 | -1) {
  switch (kind) {
    case 'slide-x':
      return {
        initial: { x: direction === 1 ? 36 : -36, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: direction === 1 ? -28 : 28, opacity: 0 },
        transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
      };
    case 'slide-y':
      return {
        initial: { y: direction === 1 ? 28 : -20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: direction === 1 ? -18 : 20, opacity: 0 },
        transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
      };
    case 'fade-lift':
      return {
        initial: { y: 14, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: -10, opacity: 0 },
        transition: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
      };
    case 'soft-scale':
      return {
        initial: { scale: 0.985, y: 8, opacity: 0 },
        animate: { scale: 1, y: 0, opacity: 1 },
        exit: { scale: 0.992, y: -8, opacity: 0 },
        transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
      };
    case 'fade':
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3, ease: 'easeInOut' },
      };
  }
}

function tabFromPathname(pathname: string) {
  if (pathname.startsWith('/app/schedule')) return 'schedule';
  if (pathname.startsWith('/app/conversations')) return 'conversations';
  if (pathname.startsWith('/app/customers')) return 'features';
  if (pathname.startsWith('/app/analytics')) return 'features';
  if (pathname.startsWith('/app/inventory')) return 'features';
  if (pathname.startsWith('/app/campaigns')) return 'features';
  if (pathname.startsWith('/app/automations')) return 'features';
  if (pathname.startsWith('/app/instagram-inbox')) return 'features';
  if (pathname.startsWith('/app/blacklist')) return 'features';
  if (pathname.startsWith('/app/salon-info')) return 'features';
  if (pathname.startsWith('/app/services')) return 'features';
  if (pathname.startsWith('/app/staff')) return 'features';
  if (pathname.startsWith('/app/features')) return 'features';
  if (pathname.startsWith('/app/settings')) return 'settings';
  if (pathname.startsWith('/app/notification-settings')) return 'settings';
  if (pathname.startsWith('/app/notifications')) return 'settings';
  if (pathname.startsWith('/app/notification-role-matrix')) return 'features';
  return 'dashboard';
}

function backTargetFromPathname(pathname: string): string | null {
  if (pathname.startsWith('/app/features/')) return '/app/features';
  if (pathname.startsWith('/app/notification-role-matrix')) return '/app/features';
  if (pathname.startsWith('/app/notification-settings')) return '/app/settings';
  if (pathname.startsWith('/app/notifications')) return '/app/settings';

  const featureModuleRoutes = [
    '/app/customers',
    '/app/analytics',
    '/app/inventory',
    '/app/campaigns',
    '/app/automations',
    '/app/instagram-inbox',
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
  const previousPathRef = useRef(location.pathname);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);

  const activeTab = tabFromPathname(location.pathname);
  const backTarget = backTargetFromPathname(location.pathname);
  const transitionKind = transitionKindFromPathname(location.pathname);
  const transitionMotion = transitionMotionByKind(transitionKind, transitionDirection);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    const currentPath = location.pathname;
    const explicitDirection =
      typeof (location.state as { navDirection?: unknown } | null)?.navDirection === 'string'
        ? ((location.state as { navDirection?: string }).navDirection as string)
        : null;

    if (explicitDirection === 'back') {
      setTransitionDirection(-1);
    } else if (explicitDirection === 'forward') {
      setTransitionDirection(1);
    } else {
      const previousDepth = previousPath.split('/').filter(Boolean).length;
      const currentDepth = currentPath.split('/').filter(Boolean).length;
      setTransitionDirection(currentDepth < previousDepth ? -1 : 1);
    }

    previousPathRef.current = currentPath;
  }, [location.pathname, location.state]);

  const handleTabChange = (tab: string) => {
    if (tab === 'schedule') {
      navigate('/app/schedule', { state: { navDirection: 'forward' } });
      return;
    }
    if (tab === 'features') {
      navigate('/app/features', { state: { navDirection: 'forward' } });
      return;
    }
    if (tab === 'conversations') {
      navigate('/app/conversations', { state: { navDirection: 'forward' } });
      return;
    }
    if (tab === 'settings') {
      navigate('/app/settings', { state: { navDirection: 'forward' } });
      return;
    }
    navigate('/app/dashboard', { state: { navDirection: 'forward' } });
  };

  return (
    <div className="min-h-screen bg-[var(--luxury-bg)]">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="relative flex items-center justify-between px-4 py-3">
          <div className="w-8">
            {backTarget ? (
              <button
                type="button"
                onClick={() => navigate(backTarget, { state: { navDirection: 'back' } })}
                className="h-8 w-8 grid place-items-center rounded-md border border-border text-muted-foreground"
                aria-label="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
            <img
              src="https://cdn.kedyapp.com/kedylogo_koyu.png"
              alt="Kedy Logo"
              className="h-[36px] w-auto dark:hidden"
              loading="eager"
            />
            <img
              src="https://cdn.kedyapp.com/kedylogo_beyazturuncu.png"
              alt="Kedy Logo"
              className="hidden h-[36px] w-auto dark:block"
              loading="eager"
            />
            <p className="text-[10px] leading-tight text-muted-foreground">
              {bootstrap?.salon?.name || 'Kedy App'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="pb-20 overflow-x-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={location.pathname}
            initial={transitionMotion.initial}
            animate={transitionMotion.animate}
            exit={transitionMotion.exit}
            transition={transitionMotion.transition}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
