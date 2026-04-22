import { useCallback, useRef, type TouchEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BottomNav } from '../layout/BottomNav';
import { useNavigator } from '../../context/NavigatorContext';
import { useAuth } from '../../context/AuthContext';

function transitionMotionByKind(direction: number) {
  // direction 1: Forward (Slide Left)
  // direction -1: Back (Slide Right)
  if (direction === 0) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 }
    };
  }

  return {
    initial: { 
      x: direction === 1 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.98
    },
    animate: { 
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: { 
      x: direction === 1 ? '-100%' : '100%',
      opacity: 0,
      scale: 1,
      zIndex: 0
    },
    transition: { 
      duration: 0.3, 
      ease: [0.32, 0.72, 0, 1] 
    }
  };
}

function tabFromPathname(pathname: string) {
  if (pathname.startsWith('/app/schedule')) return 'schedule';
  if (pathname.startsWith('/app/conversations')) return 'conversations';
  const settingsRoutes = [
    '/app/customers', '/app/analytics', '/app/inventory', '/app/campaigns', 
    '/app/automations', '/app/blacklist', '/app/salon-info',
    '/app/services', '/app/staff', '/app/data-import', '/app/operations-management', 
    '/app/brand-growth-hub', '/app/features', '/app/settings', '/app/notification-settings',
    '/app/notifications', '/app/notification-role-matrix', '/app/team-access', '/app/team-management', '/app/time-off-management'
  ];
  if (settingsRoutes.some(route => pathname.startsWith(route))) return 'settings';
  return 'dashboard';
}

function backTargetFromPathname(pathname: string): string | null {
  if (pathname === '/app/dashboard' || pathname === '/app/features' || pathname === '/app/schedule' || pathname === '/app/conversations') {
    return null;
  }

  const hubs = ['/app/operations-management', '/app/brand-growth-hub', '/app/team-management'];
  if (hubs.some(hub => pathname === hub)) return '/app/features';

  const opsChildren = ['/app/inventory', '/app/services', '/app/packages', '/app/data-import'];
  if (opsChildren.some(child => pathname === child)) return '/app/operations-management';

  const brandChildren = ['/app/campaigns', '/app/features/social-channels'];
  if (brandChildren.some(child => pathname === child)) return '/app/brand-growth-hub';

  const commsChildren = ['/app/features/whatsapp-settings', '/app/features/ai-settings', '/app/features/whatsapp-setup', '/app/features/whatsapp-agent'];
  if (commsChildren.some(child => pathname === child)) return '/app/features/social-channels';

  const teamChildren = ['/app/staff', '/app/team-access', '/app/notification-role-matrix', '/app/time-off-management'];
  if (teamChildren.some(child => pathname === child)) return '/app/team-management';

  if (pathname.startsWith('/app/notification-settings')) return '/app/settings';
  if (pathname.startsWith('/app/notifications')) return '/app/settings';
  if (pathname.startsWith('/app/settings')) return '/app/features';
  if (pathname === '/app/salon-info') return '/app/features';
  if (pathname.startsWith('/app/salon-info/')) return '/app/salon-info';
  if (pathname.startsWith('/app/automations')) return '/app/customers';
  if (pathname.startsWith('/app/blacklist')) return '/app/customers';
  if (pathname.startsWith('/app/features/')) return '/app/features';

  return '/app/features';
}

function inferHeaderTitleFromPath(pathname: string): string | null {
  if (pathname === '/app/operations-management') return 'Operasyon Yönetimi';
  if (pathname === '/app/brand-growth-hub') return 'Marka & Büyüme';
  if (pathname === '/app/team-management') return 'Ekip Yönetimi';
  if (pathname === '/app/services') return 'Hizmet Yönetimi';
  if (pathname === '/app/inventory') return 'Envanter';
  if (pathname === '/app/packages') return 'Paket Yönetimi';
  if (pathname === '/app/staff') return 'Personel Yönetimi';
  if (pathname === '/app/time-off-management') return 'Tatil ve İzin Yönetimi';
  if (pathname === '/app/salon-info') return 'Salon Bilgileri';
  if (pathname === '/app/salon-info/basic') return 'Temel Bilgiler';
  if (pathname === '/app/salon-info/faq') return 'Sık Sorulan Sorular';
  if (pathname === '/app/campaigns') return 'Kampanyalar';
  if (pathname === '/app/automations') return 'Otomasyonlar';
  if (pathname === '/app/features/website-builder') return 'Web Sitesi Ayarları';
  if (pathname.startsWith('/app/features/')) return 'Yönetim';
  return null;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { direction, headerTitle, headerActions } = useNavigator();
  const { bootstrap, logout } = useAuth();
  const edgeSwipeRef = useRef<{ active: boolean; startX: number; startY: number }>({
    active: false,
    startX: 0,
    startY: 0
  });
  const activeTab = tabFromPathname(location.pathname);
  let backTarget = backTargetFromPathname(location.pathname);
  const fromState = (location.state as any)?.from;
  if (fromState && typeof fromState === 'string') {
    backTarget = fromState;
  }
  const resolvedHeaderTitle = headerTitle ?? inferHeaderTitleFromPath(location.pathname);
  const transitionMotion = transitionMotionByKind(direction);
  const showDashboardHeader = location.pathname === '/app/dashboard';
  const showTopBar = Boolean(backTarget || resolvedHeaderTitle || headerActions || showDashboardHeader);
  const canSwipeBack = location.pathname.startsWith('/app/') && Boolean(backTarget);

  const triggerBackNavigation = useCallback(() => {
    if (backTarget) {
      navigate(backTarget, { state: { navDirection: 'back' } });
    }
  }, [backTarget, navigate]);

  const handleTabChange = (tab: string) => {
    const routeMap: Record<string, string> = {
      schedule: '/app/schedule',
      conversations: '/app/conversations',
      settings: '/app/features',
      dashboard: '/app/dashboard'
    };
    navigate(routeMap[tab] || '/app/dashboard');
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const target = event.target as HTMLElement | null;
    const disallowGesture = target?.closest('input, textarea, select, [contenteditable="true"]');
    if (disallowGesture) return;

    const fromLeftEdge = touch.clientX <= 24;

    if (canSwipeBack && fromLeftEdge) {
      edgeSwipeRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY
      };
      return;
    }

  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    if (edgeSwipeRef.current.active) {
      const deltaX = touch.clientX - edgeSwipeRef.current.startX;
      const deltaY = Math.abs(touch.clientY - edgeSwipeRef.current.startY);
      edgeSwipeRef.current.active = false;

      const horizontalEnough = deltaX > 72;
      const mostlyHorizontal = deltaY < 60 && Math.abs(deltaX) > deltaY * 1.2;
      if (horizontalEnough && mostlyHorizontal) {
        triggerBackNavigation();
      }
      return;
    }

  };

  const handleTouchCancel = () => {
    edgeSwipeRef.current.active = false;
  };

  return (
    <div
      className="min-h-screen bg-background overflow-x-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        paddingLeft: 'var(--safe-area-left)',
        paddingRight: 'var(--safe-area-right)'
      }}
    >
      {showTopBar && (
        <header
          className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-border"
          style={{ paddingTop: 'var(--safe-area-top)' }}
        >
          <div className="max-w-screen-xl mx-auto px-2 lg:px-8 h-14 relative">
            {showDashboardHeader ? (
              <div className="h-full grid grid-cols-[1fr_auto_1fr] items-center">
                <div className="min-w-0 pr-2">
                  <p className="text-[13px] font-semibold text-foreground/90 truncate">
                    {bootstrap?.salon?.name || 'Salon'}
                  </p>
                </div>
                <div className="justify-self-center">
                  <img
                    src="https://cdn.kedyapp.com/kedylogo_koyu.png"
                    alt="Kedy Logo"
                    className="h-8 w-auto dark:hidden"
                    loading="eager"
                  />
                  <img
                    src="https://cdn.kedyapp.com/kedylogo_beyazturuncu.png"
                    alt="Kedy Logo"
                    className="hidden h-8 w-auto dark:block"
                    loading="eager"
                  />
                </div>
                <div className="justify-self-end h-9 w-9" />
              </div>
            ) : (
              <div className="h-full flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-[36px]">
                  {backTarget ? (
                    <button
                      type="button"
                      onClick={triggerBackNavigation}
                      className="h-9 w-9 grid place-items-center rounded-xl transition-all active:scale-90"
                      aria-label="Geri"
                    >
                      <ChevronLeft className="h-5 w-5 text-foreground" />
                    </button>
                  ) : (
                    <div className="h-9 w-9" />
                  )}

                  {resolvedHeaderTitle && (
                    <h1 className="text-lg font-semibold tracking-tight truncate max-w-[220px]">
                      {resolvedHeaderTitle}
                    </h1>
                  )}
                </div>

                {!resolvedHeaderTitle && (
                  <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                    <img
                      src="https://cdn.kedyapp.com/kedylogo_koyu.png"
                      alt="Kedy Logo"
                      className="h-8 w-auto dark:hidden"
                      loading="eager"
                    />
                    <img
                      src="https://cdn.kedyapp.com/kedylogo_beyazturuncu.png"
                      alt="Kedy Logo"
                      className="hidden h-8 w-auto dark:block"
                      loading="eager"
                    />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
                      {bootstrap?.salon?.name || 'Kedy App'}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 min-w-[36px] justify-end">
                  {headerActions ? headerActions : (
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="h-9 w-9 grid place-items-center rounded-xl text-muted-foreground transition-all active:scale-90 hover:text-destructive"
                      aria-label="Çıkış Yap"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      <main
        className="pb-24 overflow-x-hidden min-h-screen relative scrollbar-gutter-stable"
        style={{ 
          paddingTop: showTopBar ? 'calc(4rem + var(--safe-area-top))' : 'calc(var(--safe-area-top) + 1rem)',
          contain: 'paint' 
        }}
      >
        <div className="max-w-screen-xl mx-auto px-2 lg:px-8 grid h-full overflow-hidden">
          <AnimatePresence 
            mode="popLayout" 
            initial={false}
          >
            <motion.div
              key={location.pathname}
              initial={transitionMotion.initial}
              animate={transitionMotion.animate}
              exit={transitionMotion.exit}
              transition={transitionMotion.transition}
              className="w-full h-full col-start-1 row-start-1 bg-background flex flex-col"
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
