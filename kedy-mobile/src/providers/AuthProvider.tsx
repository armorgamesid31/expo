import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { revalidateAllCentralCache, type CentralCacheDescriptor, resolveCentralGet } from '@/lib/central-data-cache';
import { ENABLE_PUSH_NOTIFICATIONS, STORAGE_KEYS } from '@/lib/config';
import { ApiError, httpRequest } from '@/lib/http';
import { syncPushToken, unregisterPushToken } from '@/services/push-notifications';
import { secureGet, secureRemove, secureSet } from '@/services/secure-storage';
import type { BootstrapResponse } from '@/types/mobile-api';

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  bootstrap: BootstrapResponse | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: <T>(
    path: string,
    options?: RequestInit & { __cache?: { mode?: 'swr' | 'network-only' | 'cache-only' } },
  ) => Promise<T>;
  hasPermission: (permissionKey: string) => boolean;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const GLOBAL_REVALIDATE_MS = 2 * 60 * 1000;

async function persistTokens(tokens: AuthTokens) {
  await Promise.all([
    secureSet(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
    secureSet(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
  ]);
}

async function clearTokens() {
  await Promise.all([secureRemove(STORAGE_KEYS.ACCESS_TOKEN), secureRemove(STORAGE_KEYS.REFRESH_TOKEN)]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  const loadBootstrap = useCallback(async (token: string) => {
    const data = await httpRequest<BootstrapResponse>('/api/mobile/bootstrap', { method: 'GET', token });
    setBootstrap(data);
    return data;
  }, []);

  const rotateAccess = useCallback(
    async (currentRefreshToken?: string | null) => {
      const tokenToUse = currentRefreshToken || refreshTokenRef.current;
      if (!tokenToUse) return null;

      if (refreshInFlightRef.current) {
        return await refreshInFlightRef.current;
      }

      const refreshPromise = (async () => {
        try {
          const response = await httpRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken: tokenToUse }),
          });

          setAccessToken(response.accessToken);
          setRefreshToken(response.refreshToken);
          refreshTokenRef.current = response.refreshToken;
          await persistTokens(response);

          return response.accessToken;
        } catch (error) {
          await clearTokens();
          setAccessToken(null);
          setRefreshToken(null);
          setBootstrap(null);
          refreshTokenRef.current = null;
          return null;
        } finally {
          refreshInFlightRef.current = null;
        }
      })();

      refreshInFlightRef.current = refreshPromise;
      return await refreshPromise;
    },
    [],
  );

  const logout = useCallback(async () => {
    const tokenToRevoke = refreshTokenRef.current;
    try {
      if (accessToken && bootstrap?.salon?.id) {
        await unregisterPushToken(async <T,>(path: string, options?: RequestInit) =>
          httpRequest<T>(path, { ...(options || {}), token: accessToken, salonId: bootstrap.salon.id }),
        );
      }

      if (tokenToRevoke) {
        await httpRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: tokenToRevoke }),
        });
      }
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      setBootstrap(null);
      refreshTokenRef.current = null;
      await clearTokens();
    }
  }, [accessToken, bootstrap?.salon?.id]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await httpRequest<{ accessToken: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      refreshTokenRef.current = response.refreshToken;
      await persistTokens(response);
      await loadBootstrap(response.accessToken);
    },
    [loadBootstrap],
  );

  const apiFetch = useCallback(
    async <T,>(
      path: string,
      options: RequestInit & { __cache?: { mode?: 'swr' | 'network-only' | 'cache-only' } } = {},
    ): Promise<T> => {
      if (!accessToken) throw new Error('Not authenticated');

      const cacheMode = options.__cache?.mode || 'swr';
      const requestOptions: RequestInit = { ...options };
      delete (requestOptions as { __cache?: unknown }).__cache;
      const method = (requestOptions.method || 'GET').toUpperCase();
      const scope = String(bootstrap?.salon?.id || 'global');

      const runNetworkRequest = async () => {
        try {
          return await httpRequest<T>(path, {
            ...requestOptions,
            token: accessToken,
            salonId: bootstrap?.salon?.id || null,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            const nextAccessToken = await rotateAccess();
            if (!nextAccessToken) {
              await logout();
              throw error;
            }
            return await httpRequest<T>(path, {
              ...requestOptions,
              token: nextAccessToken,
              salonId: bootstrap?.salon?.id || null,
            });
          }
          throw error;
        }
      };

      if (method === 'GET') {
        return await resolveCentralGet<T>({ scope, path, mode: cacheMode, fetchNetwork: runNetworkRequest });
      }

      return await runNetworkRequest();
    },
    [accessToken, bootstrap?.salon?.id, logout, rotateAccess],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoading(true);
      try {
        const [storedAccessToken, storedRefreshToken] = await Promise.all([
          secureGet(STORAGE_KEYS.ACCESS_TOKEN),
          secureGet(STORAGE_KEYS.REFRESH_TOKEN),
        ]);

        if (!active) return;
        if (!storedRefreshToken && !storedAccessToken) {
          setAccessToken(null);
          setRefreshToken(null);
          setBootstrap(null);
          refreshTokenRef.current = null;
          return;
        }

        let tokenToUse = storedAccessToken;
        if (!tokenToUse && storedRefreshToken) {
          tokenToUse = await rotateAccess(storedRefreshToken);
        }

        if (!tokenToUse) {
          await clearTokens();
          setAccessToken(null);
          setRefreshToken(null);
          setBootstrap(null);
          refreshTokenRef.current = null;
          return;
        }

        setAccessToken(tokenToUse);
        const resolvedRefreshToken = refreshTokenRef.current || storedRefreshToken || null;
        if (resolvedRefreshToken) {
          setRefreshToken(resolvedRefreshToken);
          refreshTokenRef.current = resolvedRefreshToken;
        }
        await loadBootstrap(tokenToUse);
      } catch (error) {
        console.warn('Auth bootstrap failed; clearing local tokens.', error);
        await clearTokens();
        setAccessToken(null);
        setRefreshToken(null);
        setBootstrap(null);
        refreshTokenRef.current = null;
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadBootstrap, rotateAccess]);

  useEffect(() => {
    if (!ENABLE_PUSH_NOTIFICATIONS) return;
    if (!accessToken || !bootstrap?.salon?.id) return;

    void syncPushToken(apiFetch);
  }, [accessToken, apiFetch, bootstrap?.salon?.id]);

  useEffect(() => {
    if (!accessToken || !bootstrap?.salon?.id) return;

    let disposed = false;
    const refreshAll = async () => {
      if (disposed) return;
      await revalidateAllCentralCache(async (descriptor: CentralCacheDescriptor) => {
        return await apiFetch(descriptor.path, { __cache: { mode: 'network-only' } });
      });
    };

    const intervalId = setInterval(() => {
      void refreshAll();
    }, GLOBAL_REVALIDATE_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshAll();
    });

    void refreshAll();

    return () => {
      disposed = true;
      clearInterval(intervalId);
      sub.remove();
    };
  }, [accessToken, apiFetch, bootstrap?.salon?.id]);

  const value = useMemo<AuthContextValue>(() => {
    const permissionSet = new Set(bootstrap?.permissions || []);
    return {
      isLoading,
      isAuthenticated: Boolean(accessToken && bootstrap),
      bootstrap,
      accessToken,
      login,
      logout,
      apiFetch,
      hasPermission: (permissionKey: string) => permissionSet.has(permissionKey),
    };
  }, [accessToken, apiFetch, bootstrap, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
