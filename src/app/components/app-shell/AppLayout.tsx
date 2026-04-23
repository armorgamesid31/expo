import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, Clock3, Search, UserPlus, X } from 'lucide-react';
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
  if (pathname.startsWith('/app/customers')) return 'customers';
  if (pathname.startsWith('/app/conversations')) return 'conversations';
  const menuRoutes = [
    '/app/analytics', '/app/inventory', '/app/campaigns', 
    '/app/automations', '/app/blacklist', '/app/salon-info',
    '/app/services', '/app/staff', '/app/data-import', '/app/operations-management', 
    '/app/brand-growth-hub', '/app/features', '/app/settings', '/app/notification-settings',
    '/app/notifications', '/app/notification-role-matrix', '/app/team-access', '/app/team-management', '/app/time-off-management'
  ];
  if (menuRoutes.some(route => pathname.startsWith(route))) return 'menu';
  return 'schedule';
}

function backTargetFromPathname(pathname: string): string | null {
  if (pathname === '/app/features' || pathname === '/app/schedule' || pathname === '/app/conversations' || pathname === '/app/customers') {
    return null;
  }
  if (pathname === '/app/schedule/new' || pathname === '/app/schedule/waitlist/new') return '/app/schedule';
  if (pathname === '/app/customers/new') return '/app/customers';
  if (pathname === '/app/customers/risk-menu') return '/app/customers';
  if (pathname === '/app/customers/attendance-settings') return '/app/customers/risk-menu';
  if (pathname.startsWith('/app/blacklist')) return '/app/customers/risk-menu';
  if (pathname.startsWith('/app/conversations/')) return '/app/conversations';

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
  if (pathname.startsWith('/app/customers/')) return '/app/customers';

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
  if (pathname === '/app/schedule' || pathname === '/app/schedule/new' || pathname === '/app/schedule/waitlist/new') return 'Randevular';
  if (pathname === '/app/conversations' || pathname.startsWith('/app/conversations/')) return 'Konuşmalar';
  if (pathname === '/app/operations-management') return 'Operasyon Yönetimi';
  if (pathname === '/app/brand-growth-hub') return 'Marka & Büyüme';
  if (pathname === '/app/team-management') return 'Ekip Yönetimi';
  if (pathname === '/app/services') return 'Hizmet Yönetimi';
  if (pathname === '/app/inventory') return 'Envanter';
  if (pathname === '/app/packages') return 'Paket Yönetimi';
  if (pathname === '/app/staff') return 'Personel Yönetimi';
  if (pathname === '/app/customers') return 'Müşteriler';
  if (pathname === '/app/customers/new') return 'Yeni Müşteri';
  if (pathname === '/app/customers/risk-menu') return 'Risk ve Yasaklama';
  if (pathname === '/app/customers/attendance-settings') return 'Randevu İhlali';
  if (pathname === '/app/blacklist') return 'Kara Liste';
  if (pathname === '/app/time-off-management') return 'Tatil ve İzin Yönetimi';
  if (pathname === '/app/salon-info') return 'Salon Bilgileri';
  if (pathname === '/app/salon-info/basic') return 'Temel Bilgiler';
  if (pathname === '/app/salon-info/faq') return 'Sık Sorulan Sorular';
  if (pathname === '/app/campaigns') return 'Kampanyalar';
  if (pathname === '/app/automations') return 'Otomasyonlar';
  if (pathname === '/app/features/website-builder') return 'Web Sitesi Ayarları';
  if (pathname === '/app/features') return 'Menü';
  if (pathname.startsWith('/app/features/')) return 'Yönetim';
  return null;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { direction, headerTitle, headerActions } = useNavigator();
  const { bootstrap } = useAuth();
  const edgeSwipeRef = useRef<{ active: boolean; startX: number; startY: number }>({
    active: false,
    startX: 0,
    startY: 0
  });
  const activeTab = tabFromPathname(location.pathname);
  const tabMemoryRef = useRef<Record<string, string>>({
    schedule: '/app/schedule',
    customers: '/app/customers',
    conversations: '/app/conversations',
    menu: '/app/features'
  });
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState('');
  let backTarget = backTargetFromPathname(location.pathname);
  const fromState = (location.state as any)?.from;
  if (fromState && typeof fromState === 'string') {
    backTarget = fromState;
  }
  const resolvedHeaderTitle = headerTitle ?? inferHeaderTitleFromPath(location.pathname);
  const transitionMotion = transitionMotionByKind(direction);
  const isConversationDetail = location.pathname.startsWith('/app/conversations/');
  const showTopBar = !isConversationDetail && Boolean(backTarget || resolvedHeaderTitle || headerActions);
  const canSwipeBack = location.pathname.startsWith('/app/') && Boolean(backTarget);
  const hideBottomNav = (
    location.pathname === '/app/schedule/new' ||
    location.pathname === '/app/schedule/waitlist/new' ||
    location.pathname === '/app/customers/new' ||
    isConversationDetail
  );

  useEffect(() => {
    // Keep independent history for primary work tabs, but keep "Menü" as a stable root.
    if (activeTab === 'schedule' || activeTab === 'customers' || activeTab === 'conversations') {
      tabMemoryRef.current[activeTab] = `${location.pathname}${location.search || ''}`;
    }
  }, [activeTab, location.pathname, location.search]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isShortcut) return;
      event.preventDefault();
      setSpotlightOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setQuickActionOpen(false);
    setSpotlightOpen(false);
    setSpotlightQuery('');
  }, [location.pathname]);

  const commandItems = useMemo(
    () => [
      { id: 'cmd-schedule', label: 'Takvim', hint: '/app/schedule', path: '/app/schedule', keywords: 'takvim randevu calendar' },
      { id: 'cmd-new-appointment', label: 'Yeni Randevu', hint: '/app/schedule/new', path: '/app/schedule/new', keywords: 'yeni randevu oluştur' },
      { id: 'cmd-customers', label: 'Müşteriler', hint: '/app/customers', path: '/app/customers', keywords: 'crm müşteri' },
      { id: 'cmd-new-customer', label: 'Yeni Müşteri', hint: '/app/customers/new', path: '/app/customers/new', keywords: 'müşteri ekle oluştur' },
      { id: 'cmd-conversations', label: 'Konuşmalar', hint: '/app/conversations', path: '/app/conversations', keywords: 'mesaj whatsapp instagram sohbet' },
      { id: 'cmd-features', label: 'Menü', hint: '/app/features', path: '/app/features', keywords: 'ayarlar yönetim menu' },
      { id: 'cmd-blacklist', label: 'Kara Liste', hint: '/app/blacklist', path: '/app/blacklist', keywords: 'yasaklama kara liste' },
      { id: 'cmd-attendance', label: 'Randevu İhlali', hint: '/app/customers/attendance-settings', path: '/app/customers/attendance-settings', keywords: 'ihlal yaptırım' }
    ],
    []
  );

  const filteredCommands = useMemo(() => {
    const query = spotlightQuery.trim().toLowerCase();
    if (!query) return commandItems;
    return commandItems.filter((item) => `${item.label} ${item.keywords} ${item.hint}`.toLowerCase().includes(query));
  }, [commandItems, spotlightQuery]);

  const triggerBackNavigation = useCallback(() => {
    if (backTarget) {
      navigate(backTarget, { state: { navDirection: 'back' } });
    }
  }, [backTarget, navigate]);

  const handleTabChange = (tab: string) => {
    if (tab === 'create') {
      setQuickActionOpen(true);
      return;
    }
    if (tab === 'menu') {
      if (location.pathname === '/app/features') return;
      navigate('/app/features', { state: { navDirection: 'forward' } });
      return;
    }
    const routeMap: Record<string, string> = {
      schedule: '/app/schedule',
      customers: '/app/customers',
      conversations: '/app/conversations',
      menu: '/app/features'
    };
    const fallback = routeMap[tab] || '/app/schedule';
    const target = tabMemoryRef.current[tab] || fallback;
    if (target === `${location.pathname}${location.search || ''}`) return;
    navigate(target, { state: { navDirection: 'forward' } });
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

                {resolvedHeaderTitle ? (
                  <h1 className="text-lg font-semibold tracking-tight truncate max-w-[220px]">
                    {resolvedHeaderTitle}
                  </h1>
                ) : (
                  <h1 className="text-sm font-semibold tracking-tight truncate max-w-[220px] text-muted-foreground">
                    {bootstrap?.salon?.name || 'Salon'}
                  </h1>
                )}
              </div>

              <div className="flex items-center gap-2 min-w-[36px] justify-end">
                {headerActions ? (
                  headerActions
                ) : (
                  <button
                    type="button"
                    onClick={() => setSpotlightOpen(true)}
                    className="h-9 w-9 grid place-items-center rounded-xl transition-all active:scale-90 text-muted-foreground hover:text-foreground"
                    aria-label="Hızlı arama"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
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

      {!hideBottomNav ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="w-full max-w-screen-xl pointer-events-auto">
            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        </div>
      ) : null}

      {quickActionOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/40 p-4 flex items-end" onClick={() => setQuickActionOpen(false)}>
          <div
            className="w-full max-w-screen-xl mx-auto rounded-2xl border border-border bg-card p-4 space-y-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Hızlı İşlemler</h2>
              <button
                type="button"
                className="h-8 w-8 grid place-items-center rounded-md border border-border"
                onClick={() => setQuickActionOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="w-full rounded-xl border border-border bg-background p-3 text-left text-sm font-medium inline-flex items-center gap-2"
              onClick={() => {
                setQuickActionOpen(false);
                navigate('/app/schedule/new', { state: { navDirection: 'forward', from: '/app/schedule' } });
              }}
            >
              <CalendarDays className="h-4 w-4" />
              Yeni Randevu
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-border bg-background p-3 text-left text-sm font-medium inline-flex items-center gap-2"
              onClick={() => {
                setQuickActionOpen(false);
                navigate('/app/customers/new', { state: { navDirection: 'forward', from: '/app/customers' } });
              }}
            >
              <UserPlus className="h-4 w-4" />
              Yeni Müşteri
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-border bg-background p-3 text-left text-sm font-medium inline-flex items-center gap-2"
              onClick={() => {
                setQuickActionOpen(false);
                navigate('/app/schedule/waitlist/new', { state: { navDirection: 'forward', from: '/app/schedule' } });
              }}
            >
              <Clock3 className="h-4 w-4" />
              Yeni Bekleme Talebi
            </button>
          </div>
        </div>
      ) : null}

      {spotlightOpen ? (
        <div className="fixed inset-0 z-[85] bg-black/45 p-4 sm:p-8" onClick={() => setSpotlightOpen(false)}>
          <div
            className="w-full max-w-xl mx-auto mt-[12vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={spotlightQuery}
                  onChange={(event) => setSpotlightQuery(event.target.value)}
                  placeholder="Ekran, aksiyon veya müşteri arayın…"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm"
                />
              </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filteredCommands.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSpotlightOpen(false);
                    setSpotlightQuery('');
                    navigate(item.path, { state: { navDirection: 'forward' } });
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </button>
              ))}
              {!filteredCommands.length ? <p className="px-3 py-2 text-sm text-muted-foreground">Sonuç bulunamadı.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
