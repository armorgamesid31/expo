import React, { createContext, useContext, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useLocation, useNavigationType, Location } from 'react-router-dom';

export type NavVector = 1 | -1 | 0;

interface NavigatorContextType {
  direction: NavVector;
  isBackAction: boolean;
  setDirection: (dir: NavVector) => void;
  headerTitle: string | null;
  setHeaderTitle: (title: string | null) => void;
  headerActions: React.ReactNode | null;
  setHeaderActions: (actions: React.ReactNode | null) => void;
}

const NavigatorContext = createContext<NavigatorContextType | undefined>(undefined);

const HUB_ORDER = ['/app/dashboard', '/app/schedule', '/app/conversations', '/app/features', '/app/brand-growth-hub'];

function getHierarchyLevel(path: string): number {
  if (HUB_ORDER.some(h => path === h || path === h + '/')) return 1;

  const level3 = [
    '/app/notification-settings', 
    '/app/notification-role-matrix', 
    '/app/team-access', 
    '/app/team-management',
    '/app/data-import',
    '/app/features/ai-settings',
    '/app/features/social-channels'
  ];
  if (level3.some(n => n === path || path.startsWith(n))) return 3;

  return 2; // Default for modules like /app/analytics, /app/customers etc.
}

function getTabRank(path: string): number {
  if (path.startsWith('/app/dashboard')) return 0;
  if (path.startsWith('/app/schedule')) return 1;
  if (path.startsWith('/app/conversations')) return 2;
  if (path.startsWith('/app/features') || path.startsWith('/app/brand-growth-hub')) return 3;
  return 0;
}

export function NavigatorProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();
  const prevLocRef = useRef<Location>(location);
  const [isBackAction, setIsBackAction] = useState(false);
  const [headerTitle, setHeaderTitle] = useState<string | null>(null);
  const [headerActions, setHeaderActions] = useState<React.ReactNode | null>(null);

  // Reset header on location change
  useLayoutEffect(() => {
    setHeaderTitle(null);
    setHeaderActions(null);
  }, [location.pathname]);

  // Synchronous Direction Calculation
  // We use useMemo to derive the vector DURING the render cycle 
  // so AnimatePresence sees it immediately when the route changes.
  const direction = useMemo((): NavVector => {
    const current = location;
    const prev = prevLocRef.current;
    
    // No change if same key
    if (current.key === prev.key) return 0;

    const state = current.state as any;
    const explicitDirection = state?.navDirection;

    const currentLevel = getHierarchyLevel(current.pathname);
    const prevLevel = getHierarchyLevel(prev.pathname);
    const currentRank = getTabRank(current.pathname);
    const prevRank = getTabRank(prev.pathname);

    // 1. POP / Manual Back
    if (navType === 'POP' || explicitDirection === 'back') {
      if (currentLevel < prevLevel) return 1; // Return up: Slide Right
      if (currentLevel === 1 && prevLevel === 1) return currentRank > prevRank ? 1 : -1;
      return 1; // Default back: Slide Right
    }

    // 2. Explicit Forward
    if (explicitDirection === 'forward') {
      return -1; // Detail forward: Slide Left
    }

    // 3. Automated Logic
    // Same Level (Tabs)
    if (currentLevel === 1 && prevLevel === 1) {
      // Forward (0->1) -> Motion LEFT (Vector -1)
      return currentRank > prevRank ? -1 : 1;
    }

    // Hierarchy Change
    if (currentLevel > prevLevel) {
      // INTO DEPTH: Motion LEFT (Vector -1)
      return -1;
    }
    if (currentLevel < prevLevel) {
      // BACK TO SURFACE: Motion RIGHT (Vector 1)
      return 1;
    }

    // Default for same-level depth changes (L2 -> L2)
    return -1;
  }, [location.key, navType, location.state]);

  // Update back action state
  useLayoutEffect(() => {
    setIsBackAction(direction === -1);
    prevLocRef.current = location;
  }, [location.key, direction]);

  const value = useMemo(() => ({
    direction,
    isBackAction,
    setDirection: () => {},
    headerTitle,
    setHeaderTitle,
    headerActions,
    setHeaderActions
  }), [direction, isBackAction, headerTitle, headerActions]);

  return (
    <NavigatorContext.Provider value={value}>
      {children}
    </NavigatorContext.Provider>
  );
}

export function useNavigator() {
  const context = useContext(NavigatorContext);
  if (context === undefined) {
    throw new Error('useNavigator must be used within a NavigatorProvider');
  }
  return context;
}
